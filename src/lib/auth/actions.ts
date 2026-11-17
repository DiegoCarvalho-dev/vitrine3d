"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validacoes/auth";

// Server Actions are public endpoints: validate EVERYTHING again here, even if
// the form already validated in the browser.

export type AuthResult = { error?: string; info?: string };

const TRY_AGAIN =
  "Não foi possível concluir agora. Tente de novo em instantes.";
const TOO_MANY =
  "Muitas tentativas seguidas. Aguarde um pouco e tente de novo.";

type AuthError = { code?: string; status?: number };
const isRateLimited = (error: AuthError) =>
  error.status === 429 || Boolean(error.code?.startsWith("over_"));

export async function signIn(input: unknown): Promise<AuthResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { error: "Confira o e-mail e a senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Same message for "wrong password" and "no such e-mail": doesn't reveal
    // which e-mails have an account.
    if (error.code === "invalid_credentials")
      return { error: "E-mail ou senha incorretos." };
    // Only reachable with the RIGHT password, so it reveals nothing.
    if (error.code === "email_not_confirmed") {
      return {
        error: "Confirme seu e-mail antes de entrar (use o link que enviamos).",
      };
    }
    if (isRateLimited(error)) return { error: TOO_MANY };
    return { error: TRY_AGAIN };
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
    if (isRateLimited(error)) return { error: TOO_MANY };
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return {
        error:
          "Não foi possível criar a conta com esse e-mail. Se você já tem conta, entre.",
      };
    }
    return { error: TRY_AGAIN };
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
  const { error } = await supabase.auth.signOut();
  // If Auth failed, the session may still be valid: say so instead of
  // pretending the user is logged out (shared devices!).
  if (error) redirect("/painel?erro=sair");
  redirect("/entrar");
}
