import { z } from "zod";

// Lead status (docs/03, enum status_lead) and its labels in the panel (#71).

export const LEAD_STATUSES = [
  "novo",
  "em_contato",
  "visita_agendada",
  "ganho",
  "perdido",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  visita_agendada: "Visita agendada",
  ganho: "Ganho",
  perdido: "Perdido",
};

export const leadStatusSchema = z.enum(LEAD_STATUSES);

/** ?status=novo from the link; anything else means "all". */
export function parseStatusFilter(
  value: string | string[] | undefined,
): LeadStatus | null {
  const parsed = leadStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
