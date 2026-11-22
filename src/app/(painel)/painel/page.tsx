import Link from "next/link";

import { ProjectStatusBadge } from "@/components/project-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/session";
import { getMonthSummaries } from "@/lib/analytics/queries";
import { listMyProjects } from "@/lib/empreendimentos/queries";
import { getPublicEnv } from "@/lib/env";
import { publicImageUrl } from "@/lib/validacoes/midia";

import { MonthSummary } from "./month-summary";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo", // server runs in UTC (Vercel)
});

export default async function PanelPage({
  searchParams,
}: PageProps<"/painel">) {
  const [profile, projects] = await Promise.all([
    getCurrentProfile(),
    listMyProjects(),
  ]);
  // The summary only matters (and only runs) when there are projects.
  const summaries = projects.length > 0 ? await getMonthSummaries() : null;
  const supabaseUrl = getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const firstName = profile?.nome?.trim().split(/\s+/)[0];
  const { erro, excluido } = await searchParams;

  return (
    <section>
      {excluido === "1" && (
        <p
          role="status"
          className="mb-6 rounded-md border bg-muted px-3 py-2 text-sm"
        >
          Empreendimento excluído.
        </p>
      )}
      {erro === "sair" && (
        <p
          role="alert"
          className="mb-6 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm"
        >
          Não foi possível sair agora. Tente de novo; se continuar, feche o
          navegador.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight font-stretch-semi-expanded">
            {firstName ? `Olá, ${firstName}` : "Olá"}
          </h1>
          <p className="mt-1 text-muted-foreground">Seus empreendimentos</p>
        </div>
        {projects.length > 0 && (
          <Link
            href="/painel/empreendimentos/novo"
            className={buttonVariants()}
          >
            Novo empreendimento
          </Link>
        )}
      </div>

      {summaries && (
        <div className="mt-8">
          {summaries.thisMonth ? (
            <MonthSummary
              thisMonth={summaries.thisMonth}
              lastMonth={summaries.lastMonth}
              monthStart={summaries.monthStart}
            />
          ) : (
            <p
              role="status"
              className="rounded-lg border p-4 text-sm text-muted-foreground"
              data-testid="month-summary-unavailable"
            >
              Não foi possível carregar o resumo do mês agora. Seus
              empreendimentos continuam abaixo.
            </p>
          )}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed p-8 text-center">
          <h2 className="font-heading text-lg font-semibold">
            Cadastre seu primeiro empreendimento
          </h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Com o nome, a cidade e o tamanho do prédio já dá para começar.
            Depois você completa com fotos, plantas e unidades.
          </p>
          <Link
            href="/painel/empreendimentos/novo"
            className={buttonVariants({ size: "lg", className: "mt-6" })}
          >
            Novo empreendimento
          </Link>
        </div>
      ) : (
        <ul
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="project-list"
        >
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/painel/empreendimentos/${project.id}`}
                className="flex h-full flex-col gap-3 overflow-hidden rounded-lg border bg-card p-4 transition-colors hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <ProjectCover
                  url={publicImageUrl(supabaseUrl, project.capa_url)}
                />
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-heading text-lg leading-snug font-semibold">
                    {project.nome}
                  </h2>
                  <ProjectStatusBadge status={project.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {[project.cidade, project.uf].filter(Boolean).join(" / ")}
                </p>
                <p className="mt-auto flex justify-between text-sm text-muted-foreground tabular-nums">
                  <span>
                    {project.tipo === "casa"
                      ? "Casa"
                      : `${project.unitCount} ${project.unitCount === 1 ? "unidade" : "unidades"}`}
                  </span>
                  <span>
                    Atualizado em{" "}
                    {dateFormat.format(new Date(project.atualizado_em))}
                  </span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Cover on top of the card (or a neutral band while there's none). */
function ProjectCover({ url }: { url: string | null }) {
  return (
    <div className="-mx-4 -mt-4 mb-1 aspect-video bg-muted">
      {url && (
        // Plain <img>: already compressed (WebP, up to 1920 px).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          data-testid="project-cover"
        />
      )}
    </div>
  );
}
