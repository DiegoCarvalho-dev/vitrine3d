import { z } from "zod";

// Numbers typed by brokers: "65", "65,5", "65.5" and "1.234,56" all work.

/** Parses a Brazilian-style decimal ("1.234,56", "65,5") or a dot decimal ("65.5"). */
export function parseDecimal(text: string): number | null {
  const clean = text.trim().replace(/\s/g, "");
  if (!clean) return null;
  // With a comma, dots are thousands separators ("1.234,56"). Without a
  // comma, "1.200" / "12.500.000" (groups of 3) are thousands too, as written
  // in Brazil; otherwise a single dot is the decimal ("65.5").
  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(clean)
      ? clean.replace(/\./g, "")
      : clean;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Small measures in meters ("2,75", "2.75", "2.750"): a dot is ALWAYS the
 * decimal here (nobody types a 2,750 m ceiling); no thousands separators.
 */
export function parseMeters(text: string): number | null {
  const normalized = text.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Formats for an input field with a comma ("65,5"); empty for null. */
export function formatDecimal(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(".", ",");
}

/** Whole number from a text field: only digits ("1e2", "0x10" are refused). */
export const countField = (label: string, min: number, max: number) => {
  const cap = `${label[0].toUpperCase()}${label.slice(1)}`;
  return z
    .string()
    .trim()
    .min(1, `Informe ${label}.`)
    .regex(/^\d+$/, `Use só números inteiros em ${label}.`)
    .transform(Number)
    .refine((v) => v >= min, `${cap}: mínimo ${min}.`)
    .refine((v) => v <= max, `${cap}: máximo ${max}.`);
};
