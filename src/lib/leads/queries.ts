import "server-only";

import { cache } from "react";

import { requireUserId } from "@/lib/auth/session";
import { isUuid } from "@/lib/empreendimentos/queries";
import { createClient } from "@/lib/supabase/server";

import { type Interest, interestOf } from "./interest";
import { loadSessionEvents, loadSessionsEvents } from "./load-session";
import { summarizeSession } from "./session-summary";
import type { LeadStatus } from "./status";

// Panel queries for leads (#71). The broker's own client: the RLS only
// returns leads of THEIR projects, and every query also filters by the owner
// (belt and braces: never rely on RLS alone, see empreendimentos/queries).

const LEAD_COLUMNS =
  "id, nome, telefone, email, mensagem, origem, status, criado_em, empreendimento_id, unidade_id, sessao_id, empreendimentos!inner(nome, dono_id)";

/** An embedded row: PostgREST gives an object, the generated types an array. */
function one<T>(value: T | T[] | null | undefined): T | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

export const LEADS_PAGE_LIMIT = 200;

export type LeadOrder = "recentes" | "interesse";

export type LeadFilters = {
  projectId: string | null;
  status: LeadStatus | null;
  order?: LeadOrder;
};

export async function listMyLeads({
  projectId,
  status,
  order = "recentes",
}: LeadFilters) {
  const userId = await requireUserId();
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select(`${LEAD_COLUMNS}, unidades(numero)`)
    .eq("empreendimentos.dono_id", userId)
    .order("criado_em", { ascending: false })
    .limit(LEADS_PAGE_LIMIT);
  if (projectId && isUuid(projectId))
    query = query.eq("empreendimento_id", projectId);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error)
    throw new Error(`Não foi possível carregar os leads: ${error.message}`);
  // The interest thermometer (#73): one batch of events for all the leads.
  const sessions = await loadSessionsEvents(
    supabase,
    data.flatMap((lead) =>
      lead.sessao_id
        ? [{ projectId: lead.empreendimento_id, sessionId: lead.sessao_id }]
        : [],
    ),
  );
  const leads = data.map(({ empreendimentos, unidades, ...lead }) => {
    const events = lead.sessao_id ? sessions.get(lead.sessao_id) : undefined;
    return {
      ...lead,
      projectName: one(empreendimentos)?.nome ?? "",
      unitNumber: one(unidades)?.numero ?? null,
      interest: interestOf(events?.length ? summarizeSession(events) : null),
    };
  });
  // "Most interested first": hotter first, newer first among equals.
  if (order === "interesse")
    leads.sort(
      (a, b) =>
        b.interest.points - a.interest.points ||
        b.criado_em.localeCompare(a.criado_em),
    );
  return leads;
}
export type LeadListItem = Awaited<ReturnType<typeof listMyLeads>>[number];

export type { Interest };

/** Number of NEW leads of mine (the badge in the menu). */
export const countMyNewLeads = cache(async (): Promise<number> => {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { count } = await supabase
    .from("leads")
    .select("id, empreendimentos!inner(dono_id)", {
      count: "exact",
      head: true,
    })
    .eq("empreendimentos.dono_id", userId)
    .eq("status", "novo");
  return count ?? 0;
});

/** One of MY leads (with the visit summary), or null: the page shows 404. */
export async function getMyLead(id: string) {
  const userId = await requireUserId();
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select(`${LEAD_COLUMNS}, unidades(numero)`)
    .eq("id", id)
    .eq("empreendimentos.dono_id", userId)
    .maybeSingle();
  if (!data) return null;
  const { empreendimentos, unidades, ...lead } = data;
  const session = lead.sessao_id
    ? await loadSessionEvents(supabase, {
        projectId: lead.empreendimento_id,
        sessionId: lead.sessao_id,
        extraUnitId: lead.unidade_id,
      })
    : { events: [], extraUnitNumber: null, failed: false };
  return {
    ...lead,
    projectName: one(empreendimentos)?.nome ?? "",
    unitNumber: one(unidades)?.numero ?? null,
    sessionEvents: session.events,
    interest: interestOf(
      session.events.length ? summarizeSession(session.events) : null,
    ),
  };
}

export async function listMyProjectOptions() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("empreendimentos")
    .select("id, nome")
    .eq("dono_id", userId)
    .order("nome");
  return data ?? [];
}
