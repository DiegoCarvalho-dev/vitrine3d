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
  /** Number of the unit where they walked inside (the first one), if known. */
  walkedIn?: string | null;
  days: number; // different days with a visit
};

/** "2026-11-21" in Brasília time (a visit at 21:00 is not the next day). */
const brazilDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
});

export function summarizeSession(
  events: readonly SessionEvent[],
): SessionSummary {
  const unitCount = new Map<string, number>();
  const rooms: string[] = [];
  let seconds = 0;
  let walked = false;
  let walkedIn: string | null = null;
  const days = new Set<string>();
  for (const event of events) {
    days.add(brazilDay.format(new Date(event.criado_em)));
    if (event.unidade && event.tipo === "abriu_unidade")
      unitCount.set(event.unidade, (unitCount.get(event.unidade) ?? 0) + 1);
    if (
      event.tipo === "viu_comodo" &&
      event.comodo &&
      !rooms.includes(event.comodo)
    )
      rooms.push(event.comodo);
    if (event.tipo === "saiu" && event.segundos) seconds += event.segundos;
    if (event.tipo === "caminhou") {
      walked = true;
      // Events come latest-first or oldest-first: keep any unit found.
      walkedIn ??= event.unidade;
    }
  }
  const units = [...unitCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([unit]) => unit);
  return { units, rooms, seconds, walked, walkedIn, days: days.size };
}

/** "8 min", "45 s", "1 h 05 min" */
export function durationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, "0")} min`;
}
