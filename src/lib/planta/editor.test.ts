import { describe, expect, it } from "vitest";

import {
  freeName,
  handlePoint,
  movePoints,
  overlappingKeys,
  rectFromCorners,
  resizeRect,
  snap,
} from "./editor";
import { rectToPolygon } from "./geometry";

describe("editor visual da planta (#105)", () => {
  it("encaixa na grade de 10 cm, dentro de 0 a 100 m", () => {
    expect(snap(3.04)).toBe(3);
    expect(snap(3.06)).toBe(3.1);
    expect(snap(-2)).toBe(0);
    expect(snap(140)).toBe(100);
  });

  it("desenha pelos dois cantos, em qualquer ordem; toque não vira cômodo", () => {
    expect(rectFromCorners([4.02, 3.01], [0.98, 0])).toEqual({
      x: 1,
      y: 0,
      width: 3,
      depth: 3,
    });
    expect(rectFromCorners([1, 1], [1.02, 1.03])).toBeNull();
    expect(rectFromCorners([0, 0], [0.4, 3])).toBeNull(); // lado < 0,5 m
    expect(rectFromCorners([0, 0], [0.5, 1])).toBeNull(); // 0,5 m²: pequeno demais
  });

  it("move encaixado e nunca sai da área da planta", () => {
    const sala = rectToPolygon({ x: 1, y: 1, width: 4, depth: 3 });
    expect(movePoints(sala, 0.52, -0.27)[0]).toEqual([1.5, 0.7]);
    // Arrastar para fora: para na borda, sem achatar o cômodo.
    const moved = movePoints(sala, -10, -10);
    expect(moved[0]).toEqual([0, 0]);
    expect(moved[2]).toEqual([4, 3]);
  });

  it("redimensiona só o lado puxado, com mínimo de 0,5 m e sem virar", () => {
    const rect = { x: 0, y: 0, width: 4, depth: 3 };
    expect(resizeRect(rect, "e", [5.23, 99])).toEqual({
      x: 0,
      y: 0,
      width: 5.2,
      depth: 3,
    });
    expect(resizeRect(rect, "ne", [2.04, 4])).toEqual({
      x: 0,
      y: 0,
      width: 2,
      depth: 4,
    });
    // Puxar a esquerda além da direita: para a 0,5 m dela.
    expect(resizeRect(rect, "w", [9, 0])).toEqual({
      x: 3.5,
      y: 0,
      width: 0.5,
      depth: 3,
    });
    // Encolher até 0,5 m² ou menos: a bolinha para onde estava.
    const small = { x: 0, y: 0, width: 1, depth: 1 };
    expect(resizeRect(small, "e", [0.5, 0])).toEqual(small);
    expect(handlePoint(rect, "n")).toEqual([2, 3]);
    expect(handlePoint(rect, "sw")).toEqual([0, 0]);
  });

  it("acha os cômodos sobrepostos; parede encostada não conta", () => {
    const room = (key: string, x: number, y: number, w: number, d: number) => ({
      key,
      points: rectToPolygon({ x, y, width: w, depth: d }),
    });
    const lShape = {
      key: "L",
      points: [
        [10, 0],
        [14, 0],
        [14, 2],
        [12, 2],
        [12, 4],
        [10, 4],
      ] as [number, number][],
    };
    const hits = overlappingKeys([
      room("sala", 0, 0, 4, 3),
      room("quarto", 4, 0, 3, 3), // encosta na sala
      room("banho", 6, 2, 2, 2), // invade o quarto
      lShape,
      room("fora-do-L", 12.5, 2.5, 1, 1), // no recorte do L: não sobrepõe
    ]);
    expect([...hits].sort()).toEqual(["banho", "quarto"]);
  });

  it("dois cômodos em L encaixados não contam como sobrepostos", () => {
    // Cozinha em L e área de serviço em L, uma no recorte da outra.
    const cozinha = {
      key: "cozinha",
      points: [
        [0, 0],
        [4, 0],
        [4, 2],
        [2, 2],
        [2, 4],
        [0, 4],
      ] as [number, number][],
    };
    const servico = {
      key: "servico",
      points: [
        [4, 0],
        [6, 0],
        [6, 4],
        [2, 4],
        [2, 2],
        [4, 2],
      ] as [number, number][],
    };
    expect(overlappingKeys([cozinha, servico]).size).toBe(0);
    // Mas se uma invade a outra, conta.
    const invade = {
      ...servico,
      points: servico.points.map(([x, y]) => [x - 0.5, y] as [number, number]),
    };
    expect(overlappingKeys([cozinha, invade]).size).toBe(2);
  });

  it("sugere um nome livre", () => {
    expect(freeName("Quarto", ["Sala"])).toBe("Quarto");
    expect(freeName("Quarto", ["quarto", "Quarto 2"])).toBe("Quarto 3");
  });
});
