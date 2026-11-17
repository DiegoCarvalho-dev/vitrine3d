import type { Metadata } from "next";
import Link from "next/link";

import { requireUserId } from "@/lib/auth/session";

import { CreateProjectForm } from "./create-project-form";

export const metadata: Metadata = {
  title: "Novo empreendimento | Vitrine 3D",
  robots: { index: false },
};

export default async function NewProjectPage() {
  await requireUserId();

  return (
    <section className="max-w-xl">
      <Link
        href="/painel"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Meus empreendimentos
      </Link>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight font-stretch-semi-expanded">
        Novo empreendimento
      </h1>
      <p className="mt-2 mb-8 text-muted-foreground">
        Comece pelo essencial. Fotos, plantas e unidades vêm na próxima tela.
      </p>
      <CreateProjectForm />
    </section>
  );
}
