import { describe, expect, it } from "vitest";

import {
  DEMO_FLOORS,
  DEMO_HIGHLIGHTED_UNIT,
  DEMO_UNITS_PER_FLOOR,
  demoStatus,
  demoStatusCount,
  unitNumber,
} from "./building";

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
