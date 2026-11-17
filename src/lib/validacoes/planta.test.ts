import { describe, expect, it } from "vitest";

import {
  floorPlanSchema,
  polygonArea,
  roomGeometrySchema,
  type Point,
} from "./planta";

const rect = (x0: number, y0: number, x1: number, y1: number): Point[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

describe("polygonArea", () => {
  it("calcula a área de um retângulo", () => {
    expect(polygonArea(rect(0, 0, 4, 3.5))).toBeCloseTo(14);
  });

  it("não depende do sentido dos pontos", () => {
    expect(polygonArea(rect(0, 0, 2, 3).reverse())).toBeCloseTo(6);
  });

  it("calcula a área de um L", () => {
    const l: Point[] = [
      [0, 0],
      [4, 0],
      [4, 2],
      [2, 2],
      [2, 4],
      [0, 4],
    ];
    expect(polygonArea(l)).toBeCloseTo(12);
  });
});

describe("roomGeometrySchema", () => {
  it("aceita o exemplo do docs/03", () => {
    const result = roomGeometrySchema.safeParse({
      tipo: "poligono",
      pontos: rect(0, 0, 4, 3.5),
      pe_direito: 2.7,
    });
    expect(result.success).toBe(true);
  });

  it("usa pé-direito 2,7 m quando não informado", () => {
    const g = roomGeometrySchema.parse({
      tipo: "poligono",
      pontos: rect(0, 0, 3, 3),
    });
    expect(g.pe_direito).toBe(2.7);
  });

  it("recusa coordenada negativa", () => {
    expect(
      roomGeometrySchema.safeParse({
        tipo: "poligono",
        pontos: rect(-1, 0, 3, 3),
      }).success,
    ).toBe(false);
  });

  it("recusa menos de 3 pontos", () => {
    expect(
      roomGeometrySchema.safeParse({
        tipo: "poligono",
        pontos: [
          [0, 0],
          [1, 1],
        ],
      }).success,
    ).toBe(false);
  });

  it("recusa cômodo sem área (pontos em linha)", () => {
    expect(
      roomGeometrySchema.safeParse({
        tipo: "poligono",
        pontos: [
          [0, 0],
          [1, 0],
          [2, 0],
        ],
      }).success,
    ).toBe(false);
  });

  it("recusa outro tipo de geometria", () => {
    expect(
      roomGeometrySchema.safeParse({
        tipo: "circulo",
        pontos: rect(0, 0, 3, 3),
      }).success,
    ).toBe(false);
  });
});

describe("floorPlanSchema", () => {
  it("aceita planta com portas e janelas", () => {
    const result = floorPlanSchema.safeParse({
      versao: 1,
      portas: [{ de: [4, 1], ate: [4, 1.8] }],
      janelas: [{ de: [1, 0], ate: [3, 0], peitoril: 1, altura: 1.2 }],
    });
    expect(result.success).toBe(true);
  });

  it("aceita planta vazia (portas e janelas viram listas vazias)", () => {
    expect(floorPlanSchema.parse({ versao: 1 })).toEqual({
      versao: 1,
      portas: [],
      janelas: [],
    });
  });

  it("recusa versão desconhecida", () => {
    expect(
      floorPlanSchema.safeParse({ versao: 2, portas: [], janelas: [] }).success,
    ).toBe(false);
  });
});
