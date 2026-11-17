import { z } from "zod";

// Broker profile form (/painel/perfil). Shared by the form (browser) and the
// Server Action (server). Keys in English; the action maps them to the
// perfis columns (nome, whatsapp, creci, cor_marca, notificar_leads_email).

/**
 * Normalizes what the broker types into E.164 (+5511999999999).
 * Accepts "(11) 99999-9999", "11 99999 9999", "+55 11 99999-9999", "5511999999999".
 * Numbers without country code are treated as Brazilian (DDD + number).
 * Returns null when it can't be a valid phone number.
 */
export function toE164(raw: string): string | null {
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let e164: string;
  if (hasPlus) {
    e164 = `+${digits}`;
  } else if (digits.length === 10 || digits.length === 11) {
    // Brazilian DDD (2 digits) + 8 (landline) or 9 (mobile) digits.
    e164 = `+55${digits}`;
  } else if (
    (digits.length === 12 || digits.length === 13) &&
    digits.startsWith("55")
  ) {
    e164 = `+${digits}`;
  } else {
    return null;
  }

  if (e164.startsWith("+55")) {
    const national = e164.slice(3);
    const ddd = Number(national.slice(0, 2));
    // DDDs go from 11 to 99; mobiles have 9 digits starting with 9.
    if (ddd < 11 || national.length < 10 || national.length > 11) return null;
    if (national.length === 11 && national[2] !== "9") return null;
  }
  // Same rule as the database check (perfis.whatsapp).
  return /^\+[1-9][0-9]{7,14}$/.test(e164) ? e164 : null;
}

/** "+5511999999999" → "(11) 99999-9999" (Brazil); other countries as is. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const match = e164.match(/^\+55(\d{2})(\d{4,5})(\d{4})$/);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : e164;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/;

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome.")
    .max(120, "Nome longo demais."),
  // Empty = not informed (null). Otherwise it must become a valid E.164 number.
  whatsapp: z
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
  creci: z
    .string()
    .trim()
    .max(30, "Use no máximo 30 caracteres.")
    .transform((value) => value || null),
  brandColor: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (value) => HEX_COLOR.test(value),
      "Use uma cor no formato #RRGGBB.",
    ),
  notifyLeadsByEmail: z.boolean(),
});

/** What the form holds (before transforms). */
export type ProfileFormInput = z.input<typeof profileSchema>;
/** What gets saved (after transforms: E.164, nulls). */
export type ProfileData = z.output<typeof profileSchema>;

/** WCAG contrast ratio between a color and white text (1 to 21). */
export function contrastWithWhite(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return 1.05 / (luminance + 0.05);
}
