import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { publishChecklist } from "@/lib/empreendimentos/publish";
import {
  getMyProject,
  getMyProjectDetails,
  listMyTypologies,
} from "@/lib/empreendimentos/queries";
import { getPublicEnv } from "@/lib/env";
import type { UpdateProjectInput } from "@/lib/validacoes/empreendimento";
import { publicImageUrl } from "@/lib/validacoes/midia";

import { CoverUpload } from "./cover-upload";
import { DeleteProject } from "./delete-project";
import { ProjectEditForm } from "./project-edit-form";
import { PublishPanel } from "./publish-panel";
import { TypologiesSection } from "./tipologias/typologies-section";
import { UnitsSection } from "./unidades/units-section";

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
  const { id } = await params;
  // In parallel: both check ownership (cached getMyProject).
  const [details, typologies] = await Promise.all([
    getMyProjectDetails(id),
    listMyTypologies(id),
  ]);
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

      <CoverUpload
        projectId={project.id}
        imageUrl={publicImageUrl(
          getPublicEnv().NEXT_PUBLIC_SUPABASE_URL,
          project.capa_url,
        )}
      />

      <ProjectEditForm
        projectId={project.id}
        defaultValues={defaultValues}
        unitCount={facts.units}
      />

      <TypologiesSection projectId={project.id} typologies={typologies} />

      {project.tipo === "predio" &&
      project.numero_andares &&
      project.unidades_por_andar ? (
        <UnitsSection
          projectId={project.id}
          floors={project.numero_andares}
          unitsPerFloor={project.unidades_por_andar}
          units={details.units}
          typologies={typologies.map(({ id, nome }) => ({ id, nome }))}
          gridComplete={facts.unitGridComplete}
        />
      ) : null}

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
