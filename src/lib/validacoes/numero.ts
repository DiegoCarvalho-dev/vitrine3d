import { z } from "zod";

// Numbers typed by brokers: "65", "65,5", "65.5" and "1.234,56" all work.

/** Parses a Brazilian-style decimal ("1.234,56", "65,5") or a dot decimal ("65.5"). */
export function parseDecimal(text: string): number | null {
  const clean = text.trim().replace(/\s/g, "");
  if (!clean) return null;
  // With a comma, dots are thousands separators; without, a dot is the decimal.
  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : clean;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Formats for an input field with a comma ("65,5"); empty for null. */
export function formatDecimal(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(".", ",");
}

/** Required decimal from a text field, within [min, max]. */
export const decimalField = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Informe ${label}.`)
    .transform((text, ctx) => {
      const value = parseDecimal(text);
      if (value === null) {
        ctx.addIssue({
          code: "custom",
          message: `Use só números em ${label} (ex.: 3,5).`,
        });
        return z.NEVER;
      }
      if (value < min || value > max) {
        ctx.addIssue({
          code: "custom",
          message: `${label[0].toUpperCase()}${label.slice(1)}: entre ${formatDecimal(min)} e ${formatDecimal(max)}.`,
        });
        return z.NEVER;
      }
      return value;
    });

/** Whole number from a text field (only digits), within [min, max]. */
export const countField = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, `Use só números inteiros em ${label}.`)
    .transform(Number)
    .refine(
      (n) => n >= min && n <= max,
      `${label[0].toUpperCase()}${label.slice(1)}: de ${min} a ${max}.`,
    );
