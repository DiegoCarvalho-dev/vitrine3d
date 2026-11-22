import { describe, expect, it } from "vitest";

import { type Point } from "@/lib/validacoes/planta";

import {
  findOverlap,
  isInside,
  labelPoint,
  overlapArea,
  polygonToRect,
  rectToPolygon,
  roundArea,
} from "./geometry";

const sala = {
  name: "Sala",
  points: rectToPolygon({ x: 0, y: 0, width: 5, depth: 4 }),
};
// Cômodo em L (como no seed): 0..4 × 0..2 mais 0..2 × 2..4.
const lShape: Point[] = [
  [0, 0],
  [4, 0],
  [4, 2],
  [2, 2],
  [2, 4],
  [0, 4],
];

describe("rectToPolygon / polygonToRect", () => {
  it("retângulo vira 4 pontos e volta igual", () => {
    const rect = { x: 5, y: 0, width: 3, depth: 3.5 };
    const points = rectToPolygon(rect);
    expect(points).toEqual([
      [5, 0],
      [8, 0],
      [8, 3.5],
      [5, 3.5],
    ]);
    expect(polygonToRect(points)).toEqual(rect);
  });

  it("polígono em L não é retângulo", () => {
    expect(polygonToRect(lShape)).toBeNull();
  });

  it("área calculada sozinha", () => {
    expect(roundArea(sala.points)).toBe(20);
    expect(roundArea(lShape)).toBe(12);
  });
});

describe("sobreposição", () => {
  it("encostar parede com parede não é sobrepor", () => {
    expect(findOverlap({ x: 5, y: 0, width: 3, depth: 3 }, [sala])).toBeNull();
    expect(findOverlap({ x: 0, y: 4, width: 5, depth: 2 }, [sala])).toBeNull();
  });

  it("banheiro dentro da sala é recusado", () => {
    expect(findOverlap({ x: 1, y: 1, width: 2, depth: 2 }, [sala])?.name).toBe(
      "Sala",
    );
  });

  it("sobreposição parcial conta a área certa", () => {
    expect(
      overlapArea(sala.points, { x: 4, y: 3, width: 2, depth: 2 }),
    ).toBeCloseTo(1);
  });

  it("usa o formato real do L, não a caixa em volta", () => {
    // O canto vazio do L (2..4 × 2..4) está livre.
    expect(overlapArea(lShape, { x: 2, y: 2, width: 2, depth: 2 })).toBeCloseTo(
      0,
    );
    expect(overlapArea(lShape, { x: 1, y: 1, width: 2, depth: 2 })).toBeCloseTo(
      3,
    );
  });
});

describe("labelPoint", () => {
  it("retângulo: o centro", () => {
    expect(
      labelPoint([
        [0, 0],
        [4, 0],
        [4, 2],
        [0, 2],
      ]),
    ).toEqual([2, 1]);
  });

  it("cômodo em L: o ponto fica dentro do cômodo", () => {
    const l: [number, number][] = [
      [0, 0],
      [6, 0],
      [6, 1],
      [1, 1],
      [1, 6],
      [0, 6],
    ];
    const p = labelPoint(l);
    expect(isInside(l, p)).toBe(true);
  });
});
