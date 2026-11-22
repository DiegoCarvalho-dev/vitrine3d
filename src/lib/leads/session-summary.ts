// What a visitor looked at in the tour (issue #70), from the events of their
// session: for the new-lead e-mail (and, later, the interest thermometer).
// Pure function: the caller fetches the events.

export type SessionEvent = {
  tipo: string;
  criado_em: string;
  unidade: string | null; // unit number
  comodo: string | null; // room name
  segundos: number | null; // "saiu" events: seconds visible
};

export type SessionSummary = {
  units: string[]; // unit numbers opened, most viewed first
  rooms: string[]; // room names viewed
  seconds: number; // time with the tour visible
  walked: boolean;
  days: number; // different days with a visit
};

export function summarizeSession(
  events: readonly SessionEvent[],
): SessionSummary {
  const unitCount = new Map<string, number>();
  const rooms: string[] = [];
  let seconds = 0;
  let walked = false;
  const days = new Set<string>();
  for (const event of events) {
    days.add(event.criado_em.slice(0, 10));
    if (event.unidade && event.tipo === "abriu_unidade")
      unitCount.set(event.unidade, (unitCount.get(event.unidade) ?? 0) + 1);
    if (
      event.tipo === "viu_comodo" &&
      event.comodo &&
      !rooms.includes(event.comodo)
    )
      rooms.push(event.comodo);
    if (event.tipo === "saiu" && event.segundos) seconds += event.segundos;
    if (event.tipo === "caminhou") walked = true;
  }
  const units = [...unitCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([unit]) => unit);
  return { units, rooms, seconds, walked, days: days.size };
}

/** "8 min", "45 s", "1 h 05 min" */
export function durationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, "0")} min`;
}
