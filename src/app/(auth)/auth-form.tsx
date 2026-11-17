"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { describedBy, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  signInSchema,
  signUpSchema,
  type SignInInput,
  type SignUpInput,
} from "@/lib/validacoes/auth";

import { signIn, signUp, type AuthResult } from "@/lib/auth/actions";

type Mode = "sign-in" | "sign-up";

export function AuthForm({ mode }: { mode: Mode }) {
  const isSignUp = mode === "sign-up";
  const [result, setResult] = useState<AuthResult | null>(null);

  const form = useForm<SignUpInput | SignInInput>({
    resolver: zodResolver(isSignUp ? signUpSchema : signInSchema),
    defaultValues: isSignUp
      ? { name: "", email: "", password: "" }
      : { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const fieldError = (field: "name" | "email" | "password") =>
    (errors as Partial<Record<typeof field, { message?: string }>>)[field]
      ?.message;

  async function onSubmit(values: SignUpInput | SignInInput) {
    setResult(null);
    try {
      // On success the action redirects to /painel (the router navigates).
      const response = isSignUp ? await signUp(values) : await signIn(values);
      if (response) setResult(response);
    } catch {
      // Network drop, server error or a new deploy: never fail silently.
      setResult({
        error:
          "Não foi possível conectar. Verifique a internet e tente de novo.",
      });
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      {isSignUp && (
        <FormField id="name" label="Seu nome" error={fieldError("name")}>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={Boolean(fieldError("name"))}
            aria-describedby={describedBy("name", {
              error: fieldError("name"),
            })}
            {...form.register("name")}
          />
        </FormField>
      )}

      <FormField id="email" label="E-mail" error={fieldError("email")}>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={Boolean(fieldError("email"))}
          aria-describedby={describedBy("email", {
            error: fieldError("email"),
          })}
          {...form.register("email")}
        />
      </FormField>

      <FormField
        id="password"
        label="Senha"
        hint={isSignUp ? "Pelo menos 8 caracteres." : undefined}
        error={fieldError("password")}
      >
        <Input
          id="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          aria-invalid={Boolean(fieldError("password"))}
          aria-describedby={describedBy("password", {
            error: fieldError("password"),
            hint: isSignUp ? "Pelo menos 8 caracteres." : undefined,
          })}
          {...form.register("password")}
        />
      </FormField>

      {result?.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm"
        >
          {result.error}
        </p>
      )}
      {result?.info && (
        <p
          role="status"
          className="rounded-md border border-status-disponivel/40 bg-status-disponivel/10 px-3 py-2 text-sm"
        >
          {result.info}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="mt-2 w-full"
      >
        {isSubmitting
          ? isSignUp
            ? "Criando conta…"
            : "Entrando…"
          : isSignUp
            ? "Criar conta"
            : "Entrar"}
      </Button>
    </form>
  );
}
