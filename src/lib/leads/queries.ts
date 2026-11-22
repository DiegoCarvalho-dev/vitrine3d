import "server-only";

import { cache } from "react";

import { requireUserId } from "@/lib/auth/session";
import { isUuid } from "@/lib/empreendimentos/queries";
import { createClient } from "@/lib/supabase/server";

import { loadSessionEvents } from "./load-session";
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

export type LeadFilters = {
  projectId: string | null;
  status: LeadStatus | null;
};

export async function listMyLeads({ projectId, status }: LeadFilters) {
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
  return data.map(({ empreendimentos, unidades, ...lead }) => ({
    ...lead,
    projectName: one(empreendimentos)?.nome ?? "",
    unitNumber: one(unidades)?.numero ?? null,
  }));
}
export type LeadListItem = Awaited<ReturnType<typeof listMyLeads>>[number];

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
