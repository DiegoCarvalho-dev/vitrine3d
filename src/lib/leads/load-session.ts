import type { SupabaseClient } from "@supabase/supabase-js";

import { chunks, fetchAll } from "@/lib/supabase/fetch-all";
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

const SESSIONS_PER_REQUEST = 10;
const IDS_PER_REQUEST = 100; // keeps each GET URL short
const EVENTS_PER_SESSION = 500; // the same window as the lead page

/**
 * The events of MANY sessions at once (the lead list of the panel, #73), in
 * small groups of sessions (the API returns at most 1000 rows per request, so
 * each group is paged, and one chatty session can't crowd out the others).
 * Each session keeps its latest 500 events: the same window as the lead page,
 * so the list and the page show the same thermometer.
 * `failed` = something could not be loaded (the caller says "unavailable"
 * instead of calling the lead cold).
 */
export async function loadSessionsEvents(
  client: SupabaseClient<Database>,
  sessions: readonly { projectId: string; sessionId: string }[],
): Promise<{ bySession: Map<string, SessionEvent[]>; failed: boolean }> {
  const bySession = new Map<string, SessionEvent[]>();
  if (!sessions.length) return { bySession, failed: false };
  const projectOf = new Map(sessions.map((s) => [s.sessionId, s.projectId]));

  type Row = EventRow & { sessao_id: string; empreendimento_id: string };
  const rows: Row[] = [];
  let failed = false;
  for (const group of chunks([...projectOf.keys()], SESSIONS_PER_REQUEST)) {
    const { data, error } = await fetchAll<Row>((from, to) =>
      client
        .from("eventos")
        .select(
          "tipo, criado_em, dados, unidade_id, comodo_id, sessao_id, empreendimento_id",
        )
        .in("sessao_id", group)
        .in("empreendimento_id", [
          ...new Set(group.map((id) => projectOf.get(id)!)),
        ])
        .order("criado_em", { ascending: false })
        .range(from, Math.min(to, from + 999)),
    );
    if (error) failed = true;
    rows.push(...data);
  }

  const ids = (pick: (row: Row) => string | null) => [
    ...new Set(rows.map(pick).filter((id): id is string => Boolean(id))),
  ];
  const lookup = async (
    table: "unidades" | "comodos",
    column: "numero" | "nome",
    wanted: string[],
  ) => {
    const names = new Map<string, string>();
    for (const group of chunks(wanted, IDS_PER_REQUEST)) {
      const { data, error } = await client
        .from(table)
        .select(`id, ${column}`)
        .in("id", group);
      if (error) failed = true;
      for (const row of (data ?? []) as unknown as Record<string, string>[])
        names.set(row.id, row[column]);
    }
    return names;
  };
  const [unitNumber, roomName] = await Promise.all([
    lookup(
      "unidades",
      "numero",
      ids((r) => r.unidade_id),
    ),
    lookup(
      "comodos",
      "nome",
      ids((r) => r.comodo_id),
    ),
  ]);

  // Latest first already; a session belongs to ONE project.
  for (const row of rows) {
    if (projectOf.get(row.sessao_id) !== row.empreendimento_id) continue;
    const list = bySession.get(row.sessao_id) ?? [];
    if (list.length >= EVENTS_PER_SESSION) continue;
    list.push(toSessionEvent(row, unitNumber, roomName));
    bySession.set(row.sessao_id, list);
  }
  return { bySession, failed };
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
