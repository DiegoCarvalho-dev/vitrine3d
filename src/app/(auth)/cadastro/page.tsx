import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "../auth-form";

export const metadata: Metadata = {
  title: "Criar conta | Vitrine 3D",
  robots: { index: false },
};

export default function SignUpPage() {
  return (
    <>
      <h1 className="font-heading text-3xl font-bold tracking-tight font-stretch-semi-expanded">
        Criar conta
      </h1>
      <p className="mt-2 mb-8 text-muted-foreground">
        Monte o tour 3D dos seus imóveis e receba os interessados no WhatsApp.
      </p>
      <AuthForm mode="sign-up" />
      <p className="mt-6 text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link
          href="/entrar"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </>
  );
}
