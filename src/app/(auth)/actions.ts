"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validacoes/auth";

// Server Actions are public endpoints: validate EVERYTHING again here, even if
// the form already validated in the browser.

export type AuthResult = { error?: string; info?: string };

export async function signIn(input: unknown): Promise<AuthResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { error: "Confira o e-mail e a senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Same message for "wrong password" and "no such e-mail": doesn't reveal
    // which e-mails have an account.
    return { error: "E-mail ou senha incorretos." };
  }
  redirect("/painel");
}

export async function signUp(input: unknown): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { error: "Confira os dados do cadastro." };

  const { name, email, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Becomes perfis.nome through the signup trigger (display data only).
    options: { data: { nome: name } },
  });

  if (error) {
    if (error.code === "weak_password") {
      return {
        error:
          "Essa senha é fraca demais. Use uma senha mais longa e menos óbvia.",
      };
    }
    return {
      error:
        "Não foi possível criar a conta com esse e-mail. Se você já tem conta, entre.",
    };
  }
  if (!data.session) {
    // Projects with e-mail confirmation turned on: no session until the link is clicked.
    return {
      info: "Conta criada! Enviamos um link de confirmação para o seu e-mail.",
    };
  }
  redirect("/painel");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
