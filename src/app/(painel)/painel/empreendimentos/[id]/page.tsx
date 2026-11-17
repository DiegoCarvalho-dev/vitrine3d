import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectStatusBadge } from "@/components/project-status-badge";
import { getMyProject } from "@/lib/empreendimentos/queries";

export async function generateMetadata({
  params,
}: PageProps<"/painel/empreendimentos/[id]">): Promise<Metadata> {
  const project = await getMyProject((await params).id);
  return {
    title: `${project?.nome ?? "Empreendimento"} | Vitrine 3D`,
    robots: { index: false },
  };
}

// Edit page shell. Issue #29 adds the full form (data, purchase safety,
// publish/archive/delete); #30 the cover; #31-#33 typologies, rooms and units.
export default async function ProjectPage({
  params,
}: PageProps<"/painel/empreendimentos/[id]">) {
  const project = await getMyProject((await params).id);
  // Someone else's (or a non-existent) project: 404, never "forbidden", so we
  // don't confirm that the id exists.
  if (!project) notFound();

  return (
    <section className="max-w-3xl">
      <Link
        href="/painel"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Meus empreendimentos
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight font-stretch-semi-expanded">
          {project.nome}
        </h1>
        <ProjectStatusBadge status={project.status} />
      </div>
      <p className="mt-2 text-muted-foreground">
        {[project.cidade, project.uf].filter(Boolean).join(" / ")}
        {project.tipo === "predio" &&
          ` · ${project.numero_andares} andares, ${project.unidades_por_andar} unidades por andar`}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Link:{" "}
        <span className="font-medium text-foreground">/e/{project.slug}</span>
      </p>

      <div className="mt-8 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Em breve aqui: dados completos, segurança da compra, capa, tipologias,
        plantas e unidades.
      </div>
    </section>
  );
}
