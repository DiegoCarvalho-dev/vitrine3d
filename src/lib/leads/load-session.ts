import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import type { SessionEvent } from "./session-summary";

// Loads the events of ONE visit session as `SessionEvent`s (names instead of
// ids), for the new-lead e-mail (#70) and the lead page of the panel (#71).
// Works with any typed Supabase client: the admin one (e-mail) or the
// broker's own (panel, where the RLS also limits it to their projects).

type EventRow = {
  tipo: string;
  criado_em: string;
  dados: unknown;
  unidade_id: string | null;
  comodo_id: string | null;
};

function toSessionEvent(
  event: EventRow,
  unitNumber: Map<string, string>,
  roomName: Map<string, string>,
): SessionEvent {
  const dados = event.dados as { segundos?: unknown } | null;
  // Events can be inserted straight through the public key: only a sane
  // number of seconds counts (same bounds as the site's validation).
  const seconds = dados?.segundos;
  return {
    tipo: event.tipo,
    criado_em: event.criado_em,
    unidade: event.unidade_id
      ? (unitNumber.get(event.unidade_id) ?? null)
      : null,
    comodo: event.comodo_id ? (roomName.get(event.comodo_id) ?? null) : null,
    segundos:
      Number.isInteger(seconds) &&
      (seconds as number) >= 0 &&
      (seconds as number) <= 86_400
        ? (seconds as number)
        : null,
  };
}

/**
 * The events of MANY sessions at once (the lead list of the panel, #73): one
 * query for all, grouped by session. The latest 5000 events overall.
 */
export async function loadSessionsEvents(
  client: SupabaseClient<Database>,
  sessions: readonly { projectId: string; sessionId: string }[],
): Promise<Map<string, SessionEvent[]>> {
  const bySession = new Map<string, SessionEvent[]>();
  if (!sessions.length) return bySession;
  const sessionIds = [...new Set(sessions.map((s) => s.sessionId))];
  const projectIds = [...new Set(sessions.map((s) => s.projectId))];
  const { data, error } = await client
    .from("eventos")
    .select(
      "tipo, criado_em, dados, unidade_id, comodo_id, sessao_id, empreendimento_id",
    )
    .in("sessao_id", sessionIds)
    .in("empreendimento_id", projectIds)
    .order("criado_em", { ascending: false })
    .limit(5000);
  if (error) return bySession; // no thermometer, the list still works
  const unitIds = [
    ...new Set(
      data.map((e) => e.unidade_id).filter((id): id is string => Boolean(id)),
    ),
  ];
  const roomIds = [
    ...new Set(
      data.map((e) => e.comodo_id).filter((id): id is string => Boolean(id)),
    ),
  ];
  const [units, rooms] = await Promise.all([
    unitIds.length
      ? client.from("unidades").select("id, numero").in("id", unitIds)
      : Promise.resolve({ data: [] }),
    roomIds.length
      ? client.from("comodos").select("id, nome").in("id", roomIds)
      : Promise.resolve({ data: [] }),
  ]);
  const unitNumber = new Map((units.data ?? []).map((u) => [u.id, u.numero]));
  const roomName = new Map((rooms.data ?? []).map((r) => [r.id, r.nome]));
  // A session belongs to ONE project: keep it only for the lead's project.
  const projectOf = new Map(sessions.map((s) => [s.sessionId, s.projectId]));
  for (const row of data) {
    if (projectOf.get(row.sessao_id) !== row.empreendimento_id) continue;
    const list = bySession.get(row.sessao_id) ?? [];
    list.push(toSessionEvent(row, unitNumber, roomName));
    bySession.set(row.sessao_id, list);
  }
  return bySession;
}

export async function loadSessionEvents(
  client: SupabaseClient<Database>,
  {
    projectId,
    sessionId,
    extraUnitId = null,
  }: { projectId: string; sessionId: string; extraUnitId?: string | null },
): Promise<{
  events: SessionEvent[];
  /** Number of `extraUnitId` (the lead's unit), from the same lookup. */
  extraUnitNumber: string | null;
  failed: boolean;
}> {
  // The LATEST 500: what was seen right before the contact matters most.
  const { data, error } = await client
    .from("eventos")
    .select("tipo, criado_em, dados, unidade_id, comodo_id")
    .eq("empreendimento_id", projectId)
    .eq("sessao_id", sessionId)
    .order("criado_em", { ascending: false })
    .limit(500);
  if (error) return { events: [], extraUnitNumber: null, failed: true };

  const unitIds = [
    ...new Set(
      [extraUnitId, ...data.map((e) => e.unidade_id)].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  ];
  const roomIds = [
    ...new Set(
      data.map((e) => e.comodo_id).filter((id): id is string => Boolean(id)),
    ),
  ];
  const [units, rooms] = await Promise.all([
    unitIds.length
      ? client
          .from("unidades")
          .select("id, numero")
          .eq("empreendimento_id", projectId)
          .in("id", unitIds)
      : Promise.resolve({ data: [] }),
    roomIds.length
      ? client.from("comodos").select("id, nome").in("id", roomIds)
      : Promise.resolve({ data: [] }),
  ]);
  const unitNumber = new Map((units.data ?? []).map((u) => [u.id, u.numero]));
  const roomName = new Map((rooms.data ?? []).map((r) => [r.id, r.nome]));

  const events = data.map((event) =>
    toSessionEvent(event, unitNumber, roomName),
  );
  return {
    events,
    extraUnitNumber: extraUnitId ? (unitNumber.get(extraUnitId) ?? null) : null,
    failed: false,
  };
}

/** Unit number by id, among a project's units (null if it isn't there). */
export async function unitNumberOf(
  client: SupabaseClient<Database>,
  projectId: string,
  unitId: string | null,
): Promise<string | null> {
  if (!unitId) return null;
  const { data } = await client
    .from("unidades")
    .select("numero")
    .eq("id", unitId)
    .eq("empreendimento_id", projectId)
    .maybeSingle();
  return data?.numero ?? null;
}
