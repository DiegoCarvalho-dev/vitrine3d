import { z } from "zod";

import { overlapPairs } from "@/lib/planta/editor";
import { rectToPolygon } from "@/lib/planta/geometry";

import { parseMeters } from "./numero";
import { pointSchema, polygonArea, roomGeometrySchema } from "./planta";

// Room (cômodo) form, issue #32. Until the visual editor (Sprint 8) a room is
// a rectangle typed in meters: corner (x, y) from the bottom-left of the unit,
// width (→ right) and depth (↑ up). Commas are accepted ("3,5").

export const ROOM_TYPES = [
  ["sala", "Sala"],
  ["quarto", "Quarto"],
  ["suite", "Suíte"],
  ["cozinha", "Cozinha"],
  ["banheiro", "Banheiro"],
  ["varanda", "Varanda"],
  ["lavanderia", "Lavanderia"],
  ["outro", "Outro"],
] as const;
export const roomTypeSchema = z.enum(
  ROOM_TYPES.map(([value]) => value) as [
    (typeof ROOM_TYPES)[number][0],
    ...(typeof ROOM_TYPES)[number][0][],
  ],
  { message: "Escolha o tipo do cômodo." },
);
export type RoomType = z.infer<typeof roomTypeSchema>;

const meters = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Informe ${label}.`)
    .transform((text, ctx) => {
      const value = parseMeters(text);
      if (value === null) {
        ctx.addIssue({
          code: "custom",
          message: `Use números em ${label} (ex.: 3,5).`,
        });
        return z.NEVER;
      }
      if (value < min || value > max) {
        ctx.addIssue({
          code: "custom",
          message: `${label[0].toUpperCase()}${label.slice(1)}: de ${String(min).replace(".", ",")} a ${max} m.`,
        });
        return z.NEVER;
      }
      return Math.round(value * 1000) / 1000; // millimeters are enough
    });

export const roomDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome (ex.: Sala).")
    .max(60, "Nome longo demais (máx. 60)."),
  type: roomTypeSchema,
  description: z
    .string()
    .trim()
    .max(2000, "Descrição longa demais.")
    .transform((value) => value || null),
});

export const roomRectSchema = z
  .object({
    x: meters("a posição X", 0, 100),
    y: meters("a posição Y", 0, 100),
    width: meters("a largura", 0.5, 50),
    depth: meters("a profundidade", 0.5, 50),
    ceilingHeight: meters("o pé-direito", 2.2, 6),
  })
  .superRefine((r, ctx) => {
    if (r.x + r.width > 100)
      ctx.addIssue({
        code: "custom",
        path: ["width"],
        message: "O cômodo passa de 100 m na largura.",
      });
    if (r.y + r.depth > 100)
      ctx.addIssue({
        code: "custom",
        path: ["depth"],
        message: "O cômodo passa de 100 m na profundidade.",
      });
  });

/** The whole form: details + rectangle (all fields are text in the browser). */
export const roomFormSchema = roomDetailsSchema.and(roomRectSchema);
export type RoomFormInput = z.input<typeof roomFormSchema>;
export type RoomFormData = z.output<typeof roomFormSchema>;

/** Rectangle → comodos.geometria, validated by the floor plan schema. */
export function rectGeometry(r: z.output<typeof roomRectSchema>) {
  return roomGeometrySchema.parse({
    tipo: "poligono",
    pontos: rectToPolygon(r),
    pe_direito: r.ceilingHeight,
  });
}

/**
 * The whole plan from the visual editor (issue #105), saved at once: rooms
 * with an id are updated, without id are created, missing ones are deleted.
 * Same rules as the form: name, type, 0,5 m² minimum, no overlaps.
 */
export const planRoomSchema = roomDetailsSchema.extend({
  id: z.uuid().nullable(),
  ceilingHeight: z.number().min(2.2).max(6),
  points: z.array(pointSchema).min(3).max(64),
});
export type PlanRoomInput = z.input<typeof planRoomSchema>;

export const planSaveSchema = z
  .array(planRoomSchema)
  .max(60, "No máximo 60 cômodos por tipologia.")
  .superRefine((rooms, ctx) => {
    const ids = rooms.flatMap((room) => (room.id ? [room.id] : []));
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Cômodo repetido na planta." });
    rooms.forEach((room, index) => {
      if (polygonArea(room.points) <= 0.5)
        ctx.addIssue({
          code: "custom",
          path: [index, "points"],
          message: `“${room.name}” precisa ter mais de 0,5 m².`,
        });
    });
    const [pair] = overlapPairs(rooms);
    if (pair)
      ctx.addIssue({
        code: "custom",
        message: `“${pair[0].name}” e “${pair[1].name}” estão um em cima do outro. Ajuste antes de salvar.`,
      });
  });
