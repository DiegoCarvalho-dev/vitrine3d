import { z } from "zod";

import { SESSION_PATTERN } from "./evento";
import { toE164 } from "./perfil";

// Interest form of the public tour (issue #69). The same rules in the browser
// (react-hook-form) and in the Server Action; the database checks again
// (sizes, consent, contact). Limits match the `leads` columns (docs/03).

/** Minimum time filling the form: faster than this is a bot. */
export const MIN_FILL_MS = 3_000;

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || null);

export const leadSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Informe seu nome.")
      .max(120, "Use no máximo 120 caracteres."),
    // Empty = not informed. Otherwise a Brazilian number (DDD + number).
    phone: z
      .string()
      .trim()
      .max(30, "Número longo demais.")
      .transform((value, ctx) => {
        if (!value) return null;
        const e164 = toE164(value);
        if (!e164) {
          ctx.addIssue({
            code: "custom",
            message: "Número inválido. Use DDD + número, ex.: (11) 99999-9999.",
          });
          return z.NEVER;
        }
        return e164;
      }),
    email: z
      .string()
      .trim()
      .max(254, "E-mail longo demais.")
      .transform((value, ctx) => {
        if (!value) return null;
        if (!z.email().safeParse(value).success) {
          ctx.addIssue({ code: "custom", message: "E-mail inválido." });
          return z.NEVER;
        }
        return value.toLowerCase();
      }),
    message: optionalText(2000, "Use no máximo 2000 caracteres."),
    consent: z.boolean(),
    unitId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
    // Hidden bot trap: people never see (or fill) it.
    website: z.string().max(200),
  })
  // `when`: runs even if another field has an error, so the visitor sees
  // every problem in the first try.
  .refine((lead) => lead.consent === true, {
    path: ["consent"],
    message: "Para enviar, marque que concorda com o contato.",
    when: () => true,
  })
  .superRefine((lead, ctx) => {
    if (!lead.phone && !lead.email) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Informe um telefone ou um e-mail para o corretor responder.",
      });
    }
  });

export type LeadFormInput = z.input<typeof leadSchema>;
export type LeadData = z.output<typeof leadSchema>;

/** What the Server Action receives besides the form fields. */
export const leadContextSchema = z.object({
  projectId: z.uuid(),
  // Where the link came from (?utm_source=instagram): short and plain.
  origin: z
    .string()
    .trim()
    .max(100)
    .regex(/^[\p{L}\p{N} ._-]*$/u)
    .transform((value) => value || null)
    .catch(null),
  sessionId: z.string().regex(SESSION_PATTERN).nullable().catch(null),
  // How long the form was open, measured in the browser (the phone's clock
  // may be off from the server's: an elapsed time doesn't care).
  // A tab open for days gives a huge number: capped, still a person.
  fillMs: z
    .number()
    .transform((ms) => Math.max(0, Math.min(Math.round(ms), 86_400_000)))
    .catch(0),
});
export type LeadContext = z.input<typeof leadContextSchema>;
