import { z } from "zod";

// Visit events of the public tour (issue #67), checked in the browser and on
// the server (/api/eventos) before going to `eventos` (docs/03). Only what
// the tour sends; "clicou_whatsapp" and "enviou_lead" come with #68 and #69.

export const EVENT_TYPES = [
  "abriu_tour",
  "abriu_unidade",
  "viu_comodo",
  "caminhou",
  "saiu",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Anonymous id of the browser session (same rule as the DB check). */
export const SESSION_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export const eventSchema = z.strictObject({
  empreendimentoId: z.uuid(),
  unidadeId: z.uuid().nullish(),
  comodoId: z.uuid().nullish(),
  sessaoId: z.string().regex(SESSION_PATTERN),
  tipo: z.enum(EVENT_TYPES),
  // Small and closed: only these keys (never free text from the visitor).
  dados: z
    .strictObject({
      via: z.enum(["ficha", "pagina", "etiqueta", "lista"]).optional(),
      pagina: z.enum(["predio", "unidade"]).optional(),
      segundos: z.number().int().min(0).max(86_400).optional(),
    })
    .default({}),
});
export type EventInput = z.input<typeof eventSchema>;
export type VisitEvent = z.output<typeof eventSchema>;
