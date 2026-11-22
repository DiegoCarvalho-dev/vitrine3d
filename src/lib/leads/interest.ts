import { durationLabel, type SessionSummary } from "./session-summary";

// Interest thermometer of a lead (issue #73): hot, warm or cold, from what
// the person did in the tour. A simple rule on purpose: the broker can read
// WHY (every badge comes with its reasons, in plain language).
//
//   time in the tour      5 min: 2 points · 10 min or more: 3
//   units opened          2 units: 1 point · 3 or more: 2
//   rooms viewed          3 rooms or more: 1 point
//   walked inside         2 points
//   came back on another day   2 days: 2 points · 3 or more: 3
//
//   hot (quente): 6 points or more · warm (morno): 3 to 5 · cold (frio): up to 2

export const INTEREST_LEVELS = ["quente", "morno", "frio"] as const;
export type InterestLevel = (typeof INTEREST_LEVELS)[number];

export const INTEREST_LABEL: Record<InterestLevel, string> = {
  quente: "Quente",
  morno: "Morno",
  frio: "Frio",
};

export const HOT_FROM = 6;
export const WARM_FROM = 3;

export type Interest = {
  level: InterestLevel;
  points: number;
  /** Plain-language reasons, strongest first (at most 3 shown). */
  reasons: string[];
};

type Part = { points: number; reason: string };

export function interestOf(summary: SessionSummary | null): Interest {
  if (!summary) {
    return {
      level: "frio",
      points: 0,
      reasons: ["sem registro da visita no tour"],
    };
  }
  const parts: Part[] = [];

  if (summary.days >= 3)
    parts.push({
      points: 3,
      reason: `voltou em ${summary.days} dias diferentes`,
    });
  else if (summary.days === 2)
    parts.push({ points: 2, reason: "voltou em outro dia" });

  if (summary.walked)
    parts.push({
      points: 2,
      reason: summary.walkedIn
        ? `caminhou por dentro da unidade ${summary.walkedIn}`
        : "caminhou por dentro da unidade",
    });

  if (summary.seconds >= 600)
    parts.push({
      points: 3,
      reason: `ficou ${durationLabel(summary.seconds)} no tour`,
    });
  else if (summary.seconds >= 300)
    parts.push({
      points: 2,
      reason: `ficou ${durationLabel(summary.seconds)} no tour`,
    });

  if (summary.units.length >= 3)
    parts.push({
      points: 2,
      reason: `abriu ${summary.units.length} unidades`,
    });
  else if (summary.units.length === 2)
    parts.push({ points: 1, reason: "abriu 2 unidades" });

  if (summary.rooms.length >= 3)
    parts.push({
      points: 1,
      reason: `viu ${summary.rooms.length} cômodos`,
    });

  const points = parts.reduce((sum, part) => sum + part.points, 0);
  const level: InterestLevel =
    points >= HOT_FROM ? "quente" : points >= WARM_FROM ? "morno" : "frio";
  const reasons = parts
    .sort((a, b) => b.points - a.points)
    .map((part) => part.reason);
  return {
    level,
    points,
    reasons: reasons.length ? reasons : ["olhou pouco o tour"],
  };
}

/** "Quente: voltou em 3 dias diferentes, caminhou por dentro da unidade 902" */
export function interestLine(interest: Interest, max = 3): string {
  const reasons = interest.reasons.slice(0, max).join(", ");
  return `${INTEREST_LABEL[interest.level]}: ${reasons}`;
}
