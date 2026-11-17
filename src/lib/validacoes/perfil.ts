import { z } from "zod";

import { brokerNameSchema } from "./auth";

// Broker profile form (/painel/perfil). Shared by the form (browser) and the
// Server Action (server). Keys in English; the action maps them to the
// perfis columns (nome, whatsapp, creci, cor_marca, notificar_leads_email).

/** Brand color used when the broker hasn't chosen one (theme --primary). */
export const DEFAULT_BRAND_COLOR = "#1b365d";
/** #RRGGBB, case-insensitive (the schema stores it lowercase). */
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Area codes (DDD) in use in Brazil (Anatel). */
const BRAZILIAN_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
  37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
  65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/**
 * Normalizes what the broker types into E.164 (+5511999999999).
 * Accepts "(11) 99999-9999", "11 99999 9999", "011 99999-9999", "+55 11 99999-9999",
 * "5511999999999". Numbers without country code are treated as Brazilian.
 * Returns null when it can't be a valid phone number.
 */
export function toE164(raw: string): string | null {
  const hasPlus = raw.trim().startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (hasPlus) {
    if (!digits.startsWith("55")) {
      // Other countries: only the generic E.164 rule.
      const e164 = `+${digits}`;
      return /^\+[1-9][0-9]{7,14}$/.test(e164) ? e164 : null;
    }
    digits = digits.slice(2);
  } else {
    // Trunk prefix used when dialing between cities: "011 99999-9999".
    if (
      digits.startsWith("0") &&
      (digits.length === 11 || digits.length === 12)
    ) {
      digits = digits.slice(1);
    } else if (
      digits.startsWith("55") &&
      (digits.length === 12 || digits.length === 13)
    ) {
      digits = digits.slice(2);
    }
  }

  // Brazil: DDD (2 digits) + 9-digit mobile starting with 9, or 8-digit landline (2 to 5).
  if (!BRAZILIAN_DDDS.has(Number(digits.slice(0, 2)))) return null;
  const local = digits.slice(2);
  const isMobile = local.length === 9 && local.startsWith("9");
  const isLandline = local.length === 8 && /^[2-5]/.test(local);
  return isMobile || isLandline ? `+55${digits}` : null;
}

/** "+5511999999999" → "(11) 99999-9999" (Brazil); other countries as is. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const match = e164.match(/^\+55(\d{2})(\d{4,5})(\d{4})$/);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : e164;
}

// The form AND the Server Action receive the raw strings typed by the broker
// (the action never receives the transformed output: an empty field would
// arrive as null and fail the string checks).
export const profileSchema = z.object({
  name: brokerNameSchema,
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
          message:
            "Número inválido. Use DDD + número; celular tem 9 dígitos, ex.: (11) 99999-9999.",
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
