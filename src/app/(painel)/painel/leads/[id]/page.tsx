import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getMyLead } from "@/lib/leads/queries";
import { summarizeSession } from "@/lib/leads/session-summary";
import { summaryLines } from "@/lib/email/new-lead";
import { whatsappLink } from "@/lib/tour/whatsapp";
import { formatPhone } from "@/lib/validacoes/perfil";

import { LeadActions } from "./lead-actions";

export const metadata: Metadata = { title: "Lead | Vitrine 3D" };

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function LeadPage({
  params,
}: PageProps<"/painel/leads/[id]">) {
  const lead = await getMyLead((await params).id);
  // Someone else's (or a non-existent) lead: 404, never "forbidden".
  if (!lead) notFound();

  const where = lead.unitNumber
    ? `${lead.projectName}, unidade ${lead.unitNumber}`
    : lead.projectName;
  const reply = whatsappLink(
    lead.telefone,
    `Olá, ${lead.nome}! Aqui é do ${lead.projectName}, sobre o seu interesse${lead.unitNumber ? ` na unidade ${lead.unitNumber}` : ""}.`,
  );
  const summary = lead.sessionEvents.length
    ? summarizeSession(lead.sessionEvents)
    : null;
  const visit = summaryLines(summary);

  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/painel/leads"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Leads
        </Link>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight font-stretch-semi-expanded">
          {lead.nome}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {where} · {dateFormat.format(new Date(lead.criado_em))}
        </p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {lead.telefone && (
          <div>
            <dt className="text-muted-foreground">Telefone</dt>
            <dd className="font-medium">{formatPhone(lead.telefone)}</dd>
          </div>
        )}
        {lead.email && (
          <div>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd className="font-medium break-all">{lead.email}</dd>
          </div>
        )}
        {lead.origem && (
          <div>
            <dt className="text-muted-foreground">Veio de</dt>
            <dd className="font-medium">{lead.origem}</dd>
          </div>
        )}
      </dl>

      {lead.mensagem && (
        <section
          aria-labelledby="message-title"
          className="flex flex-col gap-1"
        >
          <h2 id="message-title" className="font-heading text-lg font-semibold">
            Mensagem
          </h2>
          {/* Typed by the visitor: shown as text (React escapes it). */}
          <p className="rounded-lg border bg-card p-4 text-sm whitespace-pre-line">
            {lead.mensagem}
          </p>
        </section>
      )}

      <section aria-labelledby="visit-title" className="flex flex-col gap-1">
        <h2 id="visit-title" className="font-heading text-lg font-semibold">
          O que a pessoa viu no tour
        </h2>
        {visit.length ? (
          <ul className="list-disc pl-5 text-sm" data-testid="lead-visit">
            {visit.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p
            className="text-sm text-muted-foreground"
            data-testid="lead-visit-empty"
          >
            Sem registro da visita (o contato veio sem o histórico do tour).
          </p>
        )}
      </section>

      <LeadActions
        leadId={lead.id}
        name={lead.nome}
        status={lead.status}
        email={lead.email}
        whatsappHref={reply}
      />
    </section>
  );
}
