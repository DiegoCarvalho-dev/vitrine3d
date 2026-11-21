import { describe, expect, it } from "vitest";

import {
  DEMO_FLOORS,
  DEMO_HIGHLIGHTED_UNIT,
  DEMO_UNITS_PER_FLOOR,
  demoStatus,
  demoStatusCount,
  layoutUnits,
  statusCountLabel,
  UNIT_GAP,
  UNIT_H,
  UNIT_W,
  unitNumber,
} from "./building";

describe("layoutUnits (montagem do prédio 3D com os dados reais)", () => {
  it("põe cada unidade no andar e na posição certos, centrado em x = 0", () => {
    const units = layoutUnits(2, 2, () => "disponivel");
    expect(units.map((u) => u.number)).toEqual(["101", "102", "201", "202"]);
    expect(units[0].x).toBeCloseTo(-(UNIT_W + UNIT_GAP) / 2);
    expect(units[1].x).toBeCloseTo((UNIT_W + UNIT_GAP) / 2);
    expect(units[2].y).toBeCloseTo(UNIT_H + UNIT_GAP + UNIT_H / 2);
  });

  it("usa o status e o número vindos do banco; posição sem unidade fica vazia", () => {
    const fromDb = new Map([
      ["1-1", { status: "vendido" as const, numero: "11" }],
      ["1-2", { status: "reservado" as const, numero: "12" }],
    ]);
    const units = layoutUnits(
      1,
      3,
      (f, p) => fromDb.get(`${f}-${p}`)?.status ?? null,
      (f, p) => fromDb.get(`${f}-${p}`)?.numero ?? unitNumber(f, p),
    );
    expect(units.map((u) => [u.number, u.status])).toEqual([
      ["11", "vendido"],
      ["12", "reservado"],
    ]);
  });
});

describe("statusCountLabel", () => {
  it("concorda com unidade(s)", () => {
    expect(statusCountLabel("disponivel", 1)).toBe("1 disponível");
    expect(statusCountLabel("disponivel", 2)).toBe("2 disponíveis");
    expect(statusCountLabel("reservado", 0)).toBe("0 reservadas");
  });
});

describe("unitNumber", () => {
  it("monta o número como o corretor fala", () => {
    expect(unitNumber(9, 2)).toBe("902");
    expect(unitNumber(1, 4)).toBe("104");
  });

  it("funciona com andares de dois dígitos e mais de 9 unidades por andar", () => {
    expect(unitNumber(12, 3)).toBe("1203");
    expect(unitNumber(5, 10)).toBe("510");
  });
});

describe("demoStatus", () => {
  it("é determinístico (mesma unidade, mesmo status)", () => {
    expect(demoStatus(3, 2)).toBe(demoStatus(3, 2));
  });

  it("a unidade destacada na página inicial está disponível", () => {
    const { floor, position } = DEMO_HIGHLIGHTED_UNIT;
    expect(demoStatus(floor, position)).toBe("disponivel");
  });
});

describe("demoStatusCount", () => {
  it("conta todas as unidades do prédio de exemplo", () => {
    const count = demoStatusCount();
    expect(count.disponivel + count.reservado + count.vendido).toBe(
      DEMO_FLOORS * DEMO_UNITS_PER_FLOOR,
    );
  });
});
