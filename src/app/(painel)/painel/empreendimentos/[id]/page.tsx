import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { publishChecklist } from "@/lib/empreendimentos/publish";
import {
  getMyProject,
  getMyProjectDetails,
} from "@/lib/empreendimentos/queries";
import type { UpdateProjectInput } from "@/lib/validacoes/empreendimento";

import { DeleteProject } from "./delete-project";
import { ProjectEditForm } from "./project-edit-form";
import { PublishPanel } from "./publish-panel";

export async function generateMetadata({
  params,
}: PageProps<"/painel/empreendimentos/[id]">): Promise<Metadata> {
  const project = await getMyProject((await params).id);
  return {
    title: `${project?.nome ?? "Empreendimento"} | Vitrine 3D`,
    robots: { index: false },
  };
}

export default async function ProjectPage({
  params,
}: PageProps<"/painel/empreendimentos/[id]">) {
  const details = await getMyProjectDetails((await params).id);
  // Someone else's (or a non-existent) project: 404, never "forbidden", so we
  // don't confirm that the id exists.
  if (!details) notFound();
  const { project, facts, leadCount } = details;

  const defaultValues: UpdateProjectInput = {
    type: project.tipo,
    name: project.nome,
    slug: project.slug,
    description: project.descricao ?? "",
    address: project.endereco ?? "",
    city: project.cidade ?? "",
    // Never preselect a UF the broker didn't choose: empty forces a choice.
    state: (project.uf ?? "") as UpdateProjectInput["state"],
    floors: project.numero_andares?.toString() ?? "",
    unitsPerFloor: project.unidades_por_andar?.toString() ?? "",
    builder: project.construtora ?? "",
    incorporationRegistry: project.registro_incorporacao ?? "",
    deliveryForecast: project.previsao_entrega ?? "",
    checkedAt: project.informacoes_conferidas_em ?? "",
  };

  return (
    <section className="flex max-w-3xl flex-col gap-10">
      <div>
        <Link
          href="/painel"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Meus empreendimentos
        </Link>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight font-stretch-semi-expanded">
          {project.nome}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Link:{" "}
          <span className="font-medium text-foreground">/e/{project.slug}</span>
        </p>
      </div>

      <PublishPanel
        projectId={project.id}
        status={project.status}
        checklist={publishChecklist(facts)}
      />

      <ProjectEditForm
        projectId={project.id}
        defaultValues={defaultValues}
        unitCount={facts.units}
      />

      <section
        aria-labelledby="typologies-title"
        className="flex flex-col gap-2"
      >
        <h2
          id="typologies-title"
          className="font-heading text-xl font-semibold"
        >
          Tipologias
        </h2>
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Em breve: as plantas (tipologias) e os cômodos de cada uma.
        </p>
      </section>

      <section aria-labelledby="units-title" className="flex flex-col gap-2">
        <h2 id="units-title" className="font-heading text-xl font-semibold">
          Unidades
        </h2>
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          {facts.units > 0
            ? `${facts.units} unidades geradas. Em breve: preço e status de cada uma.`
            : "Em breve: a grade de unidades do prédio, com preço e status."}
        </p>
      </section>

      <section
        aria-labelledby="danger-title"
        className="flex flex-col gap-3 rounded-lg border border-destructive/30 p-4 sm:p-5"
      >
        <h2 id="danger-title" className="font-heading text-lg font-semibold">
          Excluir
        </h2>
        <DeleteProject
          projectId={project.id}
          projectName={project.nome}
          leadCount={leadCount}
        />
      </section>
    </section>
  );
}
