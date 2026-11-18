import { z } from "zod";

import { unitNumber } from "@/lib/building";

import { parseDecimal } from "./numero";

// Units (unidades), issue #33: the grid floors × units per floor, prices in
// reais and the bulk edit payload.

export const UNIT_STATUS = [
  ["disponivel", "Disponível"],
  ["reservado", "Reservado"],
  ["vendido", "Vendido"],
] as const;
export const unitStatusSchema = z.enum(["disponivel", "reservado", "vendido"]);
export type UnitStatus = z.infer<typeof unitStatusSchema>;

// Numbering: floor + position with 2 digits (101, 102, 1004), shared with the
// building drawing and the 3D scene.
export { unitNumber };

type Slot = { andar: number; posicao_no_andar: number };

/**
 * What "Gerar unidades" does for a building of `floors` × `perFloor`:
 * the missing slots to create (existing ones are never duplicated) and the
 * existing units that fall OUTSIDE the size (after the size was reduced).
 */
export function planGrid<T extends Slot>(
  floors: number,
  perFloor: number,
  existing: readonly T[],
) {
  const taken = new Set(
    existing.map((u) => `${u.andar}-${u.posicao_no_andar}`),
  );
  const toCreate: {
    andar: number;
    posicao_no_andar: number;
    numero: string;
  }[] = [];
  for (let floor = 1; floor <= floors; floor++) {
    for (let position = 1; position <= perFloor; position++) {
      if (!taken.has(`${floor}-${position}`)) {
        toCreate.push({
          andar: floor,
          posicao_no_andar: position,
          numero: unitNumber(floor, position),
        });
      }
    }
  }
  const outside = existing.filter(
    (u) => u.andar < 1 || u.andar > floors || u.posicao_no_andar > perFloor,
  );
  return { toCreate, outside };
}

/** "R$ 450.000,00", "450000", "450.000" → 450000. Empty → null. */
export function parseMoney(text: string): number | null | "invalid" {
  const clean = text.replace(/R\$/i, "").trim();
  if (!clean) return null;
  const value = parseDecimal(clean);
  if (value === null || value > 999_999_999_999) return "invalid";
  return Math.round(value * 100) / 100;
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
/** 450000 → "R$ 450.000,00" (empty for null). */
export function formatMoney(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : brl.format(value);
}

const uuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

/** Most units sent in one request (a 50-floor × 10 building = 500). */
export const MAX_UNITS_PER_REQUEST = 500;

/** Bulk edit: apply the same changes to several units of one project. */
export const bulkUnitsSchema = z.object({
  unitIds: z
    .array(uuid)
    .min(1, "Selecione pelo menos uma unidade.")
    .max(
      MAX_UNITS_PER_REQUEST,
      `No máximo ${MAX_UNITS_PER_REQUEST} unidades por vez.`,
    ),
  changes: z
    .object({
      typologyId: uuid.nullable().optional(),
      price: z.string().optional(),
      showPrice: z.boolean().optional(),
      status: unitStatusSchema.optional(),
    })
    .transform((c, ctx) => {
      let price: number | null | undefined;
      if (c.price !== undefined) {
        const parsed = parseMoney(c.price);
        if (parsed === "invalid") {
          ctx.addIssue({
            code: "custom",
            path: ["price"],
            message: "Preço inválido (ex.: 450.000,00).",
          });
          return z.NEVER;
        }
        price = parsed;
      }
      return { ...c, price };
    })
    .refine((c) => Object.values(c).some((v) => v !== undefined), {
      message: "Escolha o que mudar.",
    }),
});
export type BulkUnitsInput = z.input<typeof bulkUnitsSchema>;
