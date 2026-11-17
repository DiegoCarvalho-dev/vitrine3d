"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signInSchema,
  signUpSchema,
  type SignInInput,
  type SignUpInput,
} from "@/lib/validacoes/auth";

import { signIn, signUp, type AuthResult } from "./actions";

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
    // On success the action redirects to /painel (this promise doesn't return).
    const response = isSignUp ? await signUp(values) : await signIn(values);
    if (response) setResult(response);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      {isSignUp && (
        <Field id="name" label="Seu nome" error={fieldError("name")}>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={Boolean(fieldError("name"))}
            aria-describedby={fieldError("name") ? "name-error" : undefined}
            {...form.register("name")}
          />
        </Field>
      )}

      <Field id="email" label="E-mail" error={fieldError("email")}>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={Boolean(fieldError("email"))}
          aria-describedby={fieldError("email") ? "email-error" : undefined}
          {...form.register("email")}
        />
      </Field>

      <Field
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
          aria-describedby={
            fieldError("password")
              ? "password-error"
              : isSignUp
                ? "password-hint"
                : undefined
          }
          {...form.register("password")}
        />
      </Field>

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

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
