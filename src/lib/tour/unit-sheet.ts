import { z } from "zod";

import { formatDecimal } from "@/lib/validacoes/numero";
import { formatMoney } from "@/lib/validacoes/unidade";

// Unit sheet of the public tour (issue #46): what the buyer reads after
// tapping a unit. Pure functions, unit tested.

export type SheetTypology = {
  nome: string;
  quartos: number;
  suites: number;
  banheiros: number;
  vagas: number;
  area_privativa_m2: number | null;
};

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** "R$ 450.000,00" or "Sob consulta" — never the hidden price. */
export function priceLabel(publicPrice: number | null): string {
  return publicPrice === null ? "Sob consulta" : formatMoney(publicPrice);
}

/** Rows of the sheet (label → value); empty when the unit has no typology. */
export function typologyRows(
  typology: SheetTypology | null,
): [string, string][] {
  if (!typology) return [];
  const rows: [string, string][] = [
    ["Planta", typology.nome],
    ["Quartos", plural(typology.quartos, "quarto", "quartos")],
  ];
  if (typology.suites)
    rows.push(["Suítes", plural(typology.suites, "suíte", "suítes")]);
  rows.push(["Banheiros", plural(typology.banheiros, "banheiro", "banheiros")]);
  rows.push(["Vagas", plural(typology.vagas, "vaga", "vagas")]);
  if (typology.area_privativa_m2)
    rows.push([
      "Área privativa",
      `${formatDecimal(typology.area_privativa_m2)} m²`,
    ]);
  return rows;
}

/** `?unidade=902` from the link (same limit as unidades.numero: 1 to 10). */
export const unitParamSchema = z.string().trim().min(1).max(10);

export function parseUnitParam(
  value: string | string[] | undefined,
): string | null {
  const parsed = unitParamSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
