import type { Metadata } from "next";
import Link from "next/link";

import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { isUuid } from "@/lib/empreendimentos/queries";
import {
  LEADS_PAGE_LIMIT,
  listMyLeads,
  listMyProjectOptions,
} from "@/lib/leads/queries";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUSES,
  parseStatusFilter,
} from "@/lib/leads/status";
import { formatPhone } from "@/lib/validacoes/perfil";

import { interestLine } from "@/lib/leads/interest";

import { InterestBadge } from "./interest-badge";
import { LeadStatusBadge } from "./lead-status-badge";

export const metadata: Metadata = { title: "Leads | Vitrine 3D" };

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo", // the server runs in UTC (Vercel)
});

export default async function LeadsPage({
  searchParams,
}: PageProps<"/painel/leads">) {
  const query = await searchParams;
  const status = parseStatusFilter(query.status);
  const projectId =
    typeof query.empreendimento === "string" && isUuid(query.empreendimento)
      ? query.empreendimento
      : null;
  const order = query.ordem === "interesse" ? "interesse" : "recentes";
  const [leads, projects] = await Promise.all([
    listMyLeads({ projectId, status, order }),
    listMyProjectOptions(),
  ]);
  const filtered = Boolean(status || projectId || order === "interesse");

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight font-stretch-semi-expanded">
          Leads
        </h1>
        <p className="mt-1 text-muted-foreground">
          Quem deixou contato pelo tour. Os mais novos aparecem primeiro.
        </p>
      </div>

      {/* Filters in the link (GET form): works without JavaScript. */}
      <form
        method="get"
        className="flex flex-wrap items-end gap-3"
        aria-label="Filtrar leads"
      >
        <label className="flex flex-col gap-1 text-sm">
          Empreendimento
          <NativeSelect
            name="empreendimento"
            defaultValue={projectId ?? ""}
            className="h-10 w-56 md:h-8"
          >
            <option value="">Todos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.nome}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Situação
          <NativeSelect
            name="status"
            defaultValue={status ?? ""}
            className="h-10 w-44 md:h-8"
          >
            <option value="">Todas</option>
            {LEAD_STATUSES.map((value) => (
              <option key={value} value={value}>
                {LEAD_STATUS_LABEL[value]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Ordem
          <NativeSelect
            name="ordem"
            defaultValue={order}
            className="h-10 w-48 md:h-8"
          >
            <option value="recentes">Mais recentes</option>
            <option value="interesse">Mais interessados</option>
          </NativeSelect>
        </label>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {filtered && (
          <Link
            href="/painel/leads"
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            Limpar filtros
          </Link>
        )}
      </form>

      {leads.length === 0 ? (
        <p
          className="rounded-lg border bg-card p-8 text-center text-muted-foreground"
          data-testid="leads-empty"
        >
          {filtered
            ? "Nenhum contato com esses filtros."
            : "Ainda não chegou nenhum contato. Compartilhe o link do seu tour e os interessados aparecem aqui."}
        </p>
      ) : (
        <>
          {leads.length >= LEADS_PAGE_LIMIT && (
            <p
              className="text-sm text-muted-foreground"
              data-testid="leads-capped"
            >
              Mostrando os {LEADS_PAGE_LIMIT} contatos mais recentes. Use os
              filtros para ver os mais antigos.
            </p>
          )}
          <ul className="flex flex-col gap-3" data-testid="leads-list">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/painel/leads/${lead.id}`}
                  data-testid="lead-item"
                  className="flex flex-col gap-1 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{lead.nome}</span>
                    <span className="flex items-center gap-2">
                      <InterestBadge level={lead.interest.level} />
                      <LeadStatusBadge status={lead.status} />
                    </span>
                  </span>
                  <span
                    className="text-sm text-muted-foreground"
                    data-testid="interest-reasons"
                  >
                    {interestLine(lead.interest)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {[
                      lead.telefone ? formatPhone(lead.telefone) : null,
                      lead.email,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {lead.projectName}
                    {lead.unitNumber ? ` · unidade ${lead.unitNumber}` : ""}
                    {lead.origem ? ` · veio de ${lead.origem}` : ""}
                    {" · "}
                    {dateFormat.format(new Date(lead.criado_em))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
