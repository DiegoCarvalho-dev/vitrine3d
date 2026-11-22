import { describe, expect, it } from "vitest";

import seed from "../../../supabase/seed/residencial-demo.json";
import type { RoomType } from "@/lib/validacoes/comodo";
import type { Point } from "@/lib/validacoes/planta";

import {
  blockingSegments,
  collides,
  rayDistance,
  startPoint,
  step,
} from "./collision";
import type { DoorRoom } from "./doors";
import { isInside } from "./geometry";

const rect = (
  id: string,
  type: RoomType,
  x: number,
  y: number,
  w: number,
  d: number,
): DoorRoom => ({
  id,
  type,
  height: 2.7,
  points: [
    [x, y],
    [x + w, y],
    [x + w, y + d],
    [x, y + d],
  ],
});

/** Walks from a to b in small steps; returns where it ended. */
function walk(
  from: Point,
  to: Point,
  walls: ReturnType<typeof blockingSegments>,
) {
  let at = from;
  for (let i = 0; i < 400; i++) {
    const dx = to[0] - at[0];
    const dy = to[1] - at[1];
    const left = Math.hypot(dx, dy);
    if (left < 0.05) break;
    const size = Math.min(0.05, left);
    at = step(at, [(dx / left) * size, (dy / left) * size], walls);
  }
  return at;
}

describe("colisão do modo caminhar", () => {
  // Sala (0..4) e quarto (4..7), porta automática no meio (y 1,1 a 1,9).
  const rooms = [
    rect("sala", "sala", 0, 0, 4, 3),
    rect("q", "quarto", 4, 0, 3, 3),
  ];
  const walls = blockingSegments(rooms);

  it("a parede bloqueia", () => {
    expect(collides([4, 0.5], walls)).toBe(true);
    // Indo reto contra a parede fora da porta, para antes dela.
    const end = walk([2, 0.5], [6, 0.5], walls);
    expect(end[0]).toBeLessThan(4);
  });

  it("a porta deixa passar", () => {
    expect(collides([4, 1.5], walls)).toBe(false);
    const end = walk([2, 1.5], [6, 1.5], walls);
    expect(end[0]).toBeGreaterThan(5.9);
  });

  it("encostado na parede, desliza em vez de travar", () => {
    // Na diagonal contra a parede externa de baixo: x continua andando.
    const end = step([2, 0.4], [0.1, -0.1], walls);
    expect(end[0]).toBeCloseTo(2.1);
    expect(end[1]).toBeCloseTo(0.4);
  });

  it("verga acima da porta e janela alta não bloqueiam; peitoril bloqueia", () => {
    const withWindow = blockingSegments(rooms, {
      portas: [],
      janelas: [{ de: [1, 0], ate: [3, 0], peitoril: 1, altura: 1.2 }],
    });
    // A parede de baixo continua bloqueando (o peitoril vai até 1 m).
    expect(collides([2, 0.2], withWindow)).toBe(true);
  });

  it("começa na porta de entrada, virado para dentro", () => {
    const tipoA = seed.tipologias[0];
    const seedRooms: DoorRoom[] = tipoA.comodos.map((c, i) => ({
      id: `${i}`,
      type: c.tipo as RoomType,
      points: c.geometria.pontos as Point[],
      height: c.geometria.pe_direito,
    }));
    const plan = tipoA.planta as unknown as {
      portas: { de: Point; ate: Point }[];
      janelas: { de: Point; ate: Point; peitoril: number; altura: number }[];
    };
    const { at, facing } = startPoint(seedRooms, plan);
    // Entrada em x = 0 (y 3 a 3,9), na sala: começa dentro, olhando para +x.
    const sala = seedRooms.find((r) => r.type === "sala")!;
    expect(isInside(sala.points, at)).toBe(true);
    expect(facing[0]).toBeCloseTo(1);
    expect(collides(at, blockingSegments(seedRooms, plan))).toBe(false);
  });

  it("sem porta de entrada: começa no meio da sala, olhando para o espaço livre", () => {
    const { at, facing } = startPoint(rooms);
    expect(at).toEqual([2, 1.5]);
    // Pela porta (x = 4) até a parede do fundo do quarto (x = 7): 5 m.
    expect(facing[0]).toBeCloseTo(1);
    expect(rayDistance(at, facing, walls)).toBeGreaterThan(4.5);
  });
});
