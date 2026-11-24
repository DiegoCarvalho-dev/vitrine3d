import { describe, expect, it } from "vitest";

import { blockingSegments, collides } from "./collision";
import { rectToPolygon } from "./geometry";
import { clearLine, findPath, walkGrid } from "./path";

// Sala 0..4 × 0..3 e quarto 4..7 × 0..3, porta automática na parede x = 4.
const rooms = [
  {
    id: "sala",
    type: "sala" as const,
    points: rectToPolygon({ x: 0, y: 0, width: 4, depth: 3 }),
    height: 2.7,
  },
  {
    id: "quarto",
    type: "quarto" as const,
    points: rectToPolygon({ x: 4, y: 0, width: 3, depth: 3 }),
    height: 2.7,
  },
];
// Sem móveis: o teste é do caminho pelas paredes e portas.
const walls = blockingSegments(rooms, {
  portas: [{ de: [4, 1.1], ate: [4, 1.9] }],
  janelas: [],
  moveis: false,
} as Parameters<typeof blockingSegments>[1]);
const grid = walkGrid(walls, { x0: 0, y0: 0, x1: 7, y1: 3 });

const walkable = (from: [number, number], path: [number, number][]) => {
  let at = from;
  for (const p of path) {
    if (!clearLine(at, p, walls)) return false;
    at = p;
  }
  return true;
};

describe("tocar no chão para andar (#108)", () => {
  it("em linha reta quando não há parede no caminho", () => {
    expect(findPath(grid, walls, [1, 1], [3, 2])).toEqual([[3, 2]]);
  });

  it("de um cômodo ao outro, passando pela porta", () => {
    const from: [number, number] = [1, 0.6];
    const to: [number, number] = [6, 0.6];
    expect(clearLine(from, to, walls)).toBe(false); // a parede no meio
    const path = findPath(grid, walls, from, to);
    expect(path.at(-1)).toEqual(to);
    expect(walkable(from, path)).toBe(true);
    // Passa perto da porta (x = 4, y entre 1,1 e 1,9).
    expect(
      path.some((p) => Math.abs(p[0] - 4) < 0.5 && p[1] > 0.9 && p[1] < 2.1),
    ).toBe(true);
  });

  it("toque fora do apartamento: vai até o ponto alcançável mais perto", () => {
    const path = findPath(grid, walls, [1, 1.5], [-3, 1.5]);
    const end = path.at(-1)!;
    expect(collides(end, walls)).toBe(false);
    expect(end[0]).toBeLessThan(0.8); // encostou do lado de dentro
  });
});
