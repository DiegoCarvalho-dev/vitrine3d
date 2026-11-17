import { describe, expect, it } from "vitest";

import { areaDoPoligono, geometriaComodoSchema, plantaSchema } from "./planta";

const retangulo = (x0: number, y0: number, x1: number, y1: number) => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

describe("areaDoPoligono", () => {
  it("calcula a área de um retângulo", () => {
    expect(
      areaDoPoligono(retangulo(0, 0, 4, 3.5) as [number, number][]),
    ).toBeCloseTo(14);
  });

  it("não depende do sentido dos pontos", () => {
    const pontos = retangulo(0, 0, 2, 3).reverse() as [number, number][];
    expect(areaDoPoligono(pontos)).toBeCloseTo(6);
  });

  it("calcula a área de um L", () => {
    const l: [number, number][] = [
      [0, 0],
      [4, 0],
      [4, 2],
      [2, 2],
      [2, 4],
      [0, 4],
    ];
    expect(areaDoPoligono(l)).toBeCloseTo(12);
  });
});

describe("geometriaComodoSchema", () => {
  it("aceita o exemplo do docs/03", () => {
    const resultado = geometriaComodoSchema.safeParse({
      tipo: "poligono",
      pontos: retangulo(0, 0, 4, 3.5),
      pe_direito: 2.7,
    });
    expect(resultado.success).toBe(true);
  });

  it("usa pé-direito 2,7 m quando não informado", () => {
    const g = geometriaComodoSchema.parse({
      tipo: "poligono",
      pontos: retangulo(0, 0, 3, 3),
    });
    expect(g.pe_direito).toBe(2.7);
  });

  it("recusa coordenada negativa", () => {
    expect(
      geometriaComodoSchema.safeParse({
        tipo: "poligono",
        pontos: retangulo(-1, 0, 3, 3),
      }).success,
    ).toBe(false);
  });

  it("recusa menos de 3 pontos", () => {
    expect(
      geometriaComodoSchema.safeParse({
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
      geometriaComodoSchema.safeParse({
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
      geometriaComodoSchema.safeParse({
        tipo: "circulo",
        pontos: retangulo(0, 0, 3, 3),
      }).success,
    ).toBe(false);
  });
});

describe("plantaSchema", () => {
  it("aceita planta com portas e janelas", () => {
    const resultado = plantaSchema.safeParse({
      versao: 1,
      portas: [{ de: [4, 1], ate: [4, 1.8] }],
      janelas: [{ de: [1, 0], ate: [3, 0], peitoril: 1, altura: 1.2 }],
    });
    expect(resultado.success).toBe(true);
  });

  it("aceita planta vazia (portas e janelas viram listas vazias)", () => {
    expect(plantaSchema.parse({ versao: 1 })).toEqual({
      versao: 1,
      portas: [],
      janelas: [],
    });
  });

  it("recusa versão desconhecida", () => {
    expect(
      plantaSchema.safeParse({ versao: 2, portas: [], janelas: [] }).success,
    ).toBe(false);
  });
});
