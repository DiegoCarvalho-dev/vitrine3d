import { z } from "zod";

import { countField, parseDecimal } from "./numero";

// Typology (tipologia) form. Same rules as the database: name 1-60 and unique
// in the project, counts 0-20, private area > 0 and up to 10,000 m².

export const typologySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome (ex.: Tipo A).")
    .max(60, "Nome longo demais (máx. 60)."),
  bedrooms: countField("quartos", 0, 20),
  suites: countField("suítes", 0, 20),
  bathrooms: countField("banheiros", 0, 20),
  parkingSpots: countField("vagas", 0, 20),
  privateArea: z
    .string()
    .trim()
    .transform((text, ctx) => {
      if (!text) return null; // optional
      const value = parseDecimal(text);
      if (value === null || value <= 0 || value > 10000) {
        ctx.addIssue({
          code: "custom",
          message: "Área privativa: número maior que 0 (ex.: 65,5).",
        });
        return z.NEVER;
      }
      return Math.round(value * 100) / 100;
    }),
});

export type TypologyInput = z.input<typeof typologySchema>;
export type TypologyData = z.output<typeof typologySchema>;

/** Name for a copy: "Tipo A (cópia)", then "Tipo A (cópia 2)"... within 60 chars. */
export function copyName(name: string, taken: readonly string[]): string {
  const used = new Set(taken);
  for (let n = 1; n < 1000; n++) {
    const suffix = n === 1 ? " (cópia)" : ` (cópia ${n})`;
    const candidate = `${name.slice(0, 60 - suffix.length)}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${name.slice(0, 40)} ${Date.now()}`;
}
