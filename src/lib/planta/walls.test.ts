import { describe, expect, it } from "vitest";

import { buildWalls, type PlanRoom, wallLength } from "./walls";

const rect = (
  id: string,
  x: number,
  y: number,
  w: number,
  d: number,
  height = 2.7,
): PlanRoom => ({
  id,
  height,
  points: [
    [x, y],
    [x + w, y],
    [x + w, y + d],
    [x, y + d],
  ],
});

const totalLength = (walls: { a: [number, number]; b: [number, number] }[]) =>
  Math.round(walls.reduce((sum, w) => sum + wallLength(w), 0) * 1000) / 1000;

describe("paredes da planta", () => {
  it("um cômodo sozinho: 4 paredes externas", () => {
    const walls = buildWalls([rect("sala", 0, 0, 4, 3)]);
    expect(walls).toHaveLength(4);
    expect(walls.every((w) => w.rooms.length === 1)).toBe(true);
    expect(totalLength(walls)).toBe(14);
  });

  it("dois cômodos encostados: a parede do meio é uma só", () => {
    const walls = buildWalls([
      rect("sala", 0, 0, 4, 3),
      rect("quarto", 4, 0, 3, 3),
    ]);
    const shared = walls.filter((w) => w.rooms.length === 2);
    expect(shared).toHaveLength(1);
    expect(shared[0].rooms.sort()).toEqual(["quarto", "sala"]);
    expect(wallLength(shared[0])).toBe(3);
    // Perímetro externo 2 × (7 + 3) = 20, mais 3 da parede do meio.
    expect(totalLength(walls)).toBe(23);
  });

  it("encosto parcial: só o trecho comum é compartilhado", () => {
    // Circulação 0..8 em cima da sala 0..5 e do banheiro 5..8.
    const walls = buildWalls([
      rect("sala", 0, 0, 5, 3),
      rect("banheiro", 5, 2, 3, 1),
      rect("circulacao", 0, 3, 8, 1),
    ]);
    const shared = (a: string, b: string) =>
      walls.filter((w) => w.rooms.includes(a) && w.rooms.includes(b));
    expect(shared("sala", "circulacao").map(wallLength)).toEqual([5]);
    expect(shared("banheiro", "circulacao").map(wallLength)).toEqual([3]);
    expect(shared("sala", "banheiro").map(wallLength)).toEqual([1]);
    // Nenhum trecho aparece duas vezes.
    const keys = walls.map((w) => `${w.a}|${w.b}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("cômodo em L ao lado de um retângulo", () => {
    const l: PlanRoom = {
      id: "sala",
      height: 2.7,
      points: [
        [0, 0],
        [6, 0],
        [6, 2],
        [3, 2],
        [3, 5],
        [0, 5],
      ],
    };
    const walls = buildWalls([l, rect("quarto", 3, 2, 3, 3)]);
    const shared = walls.filter((w) => w.rooms.length === 2);
    expect(shared.map(wallLength).sort()).toEqual([3, 3]);
    // Contorno externo do quadrado 6 × 5 = 22, mais as duas paredes internas.
    expect(totalLength(walls)).toBe(28);
  });

  it("parede compartilhada fica com o maior pé-direito", () => {
    const walls = buildWalls([
      rect("sala", 0, 0, 4, 3, 2.7),
      rect("banheiro", 4, 0, 2, 3, 2.5),
    ]);
    expect(walls.find((w) => w.rooms.length === 2)?.height).toBe(2.7);
    const bathroomOnly = walls.filter(
      (w) => w.rooms.length === 1 && w.rooms[0] === "banheiro",
    );
    expect(bathroomOnly.every((w) => w.height === 2.5)).toBe(true);
  });

  it("pontos em ordem horária também funcionam", () => {
    const clockwise: PlanRoom = {
      ...rect("quarto", 4, 0, 3, 3),
      points: [
        [4, 0],
        [4, 3],
        [7, 3],
        [7, 0],
      ],
    };
    const walls = buildWalls([rect("sala", 0, 0, 4, 3), clockwise]);
    expect(walls.filter((w) => w.rooms.length === 2)).toHaveLength(1);
  });
});
