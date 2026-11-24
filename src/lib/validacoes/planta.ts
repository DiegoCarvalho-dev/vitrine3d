import { z } from "zod";

// Floor plan format (docs/03-modelagem-de-dados.md, "Formato da planta").
// Everything in METERS, origin (0,0) at the bottom-left corner of the unit.
// Validated here before saving to comodos.geometria and tipologias.planta.
// (Identifiers in English per CLAUDE.md; JSON keys mirror the DB columns.)

const coordinate = z
  .number()
  .finite()
  .min(0, "Coordenada negativa: a origem (0,0) é o canto inferior esquerdo.")
  .max(100, "Coordenada acima de 100 m.");

export const pointSchema = z.tuple([coordinate, coordinate]);
export type Point = z.infer<typeof pointSchema>;

/** Area of a simple polygon (shoelace formula), in m². */
export function polygonArea(
  points: readonly (readonly [number, number])[],
): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

/** comodos.geometria */
export const roomGeometrySchema = z
  .object({
    tipo: z.literal("poligono"),
    pontos: z
      .array(pointSchema)
      .min(3, "Um cômodo precisa de pelo menos 3 pontos.")
      .max(64),
    pe_direito: z.number().min(2.2).max(6).default(2.7),
  })
  .refine((g) => polygonArea(g.pontos) > 0.5, {
    message: "O cômodo precisa ter área (mais de 0,5 m²).",
    path: ["pontos"],
  });
export type RoomGeometry = z.infer<typeof roomGeometrySchema>;

const segmentSchema = z.object({ de: pointSchema, ate: pointSchema });

/** tipologias.planta (extra elements besides the rooms) */
export const floorPlanSchema = z.object({
  versao: z.literal(1),
  // true: the broker set the doors in the editor (#106), even if none; no
  // automatic doors then (only a bridge to a room nobody could reach).
  portas_definidas: z.boolean().optional(),
  // Simple furniture in the 3D (#107); false turns it off (default: on).
  moveis: z.boolean().optional(),
  portas: z.array(segmentSchema).max(200).default([]),
  janelas: z
    .array(
      segmentSchema.extend({
        peitoril: z.number().min(0).max(3),
        altura: z.number().min(0.2).max(3),
      }),
    )
    .max(200)
    .default([]),
});
export type FloorPlan = z.infer<typeof floorPlanSchema>;
