import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "../auth-form";

export const metadata: Metadata = {
  title: "Entrar | Vitrine 3D",
  robots: { index: false },
};

export default function SignInPage() {
  return (
    <>
      <h1 className="font-heading text-3xl font-bold tracking-tight font-stretch-semi-expanded">
        Entrar
      </h1>
      <p className="mt-2 mb-8 text-muted-foreground">
        Acesse o painel dos seus empreendimentos.
      </p>
      <AuthForm mode="sign-in" />
      <p className="mt-6 text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link
          href="/cadastro"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Criar conta
        </Link>
      </p>
    </>
  );
}
