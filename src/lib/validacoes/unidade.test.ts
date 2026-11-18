import { describe, expect, it } from "vitest";

import {
  bulkUnitsSchema,
  formatMoney,
  parseMoney,
  planGrid,
  unitNumber,
} from "./unidade";

const ID = "0d3e0000-0000-4000-8000-000000000001";

describe("numeração das unidades", () => {
  it.each([
    [1, 1, "101"],
    [1, 4, "104"],
    [10, 2, "1002"],
    [3, 12, "312"],
  ])("andar %d, posição %d → %s", (floor, position, number) => {
    expect(unitNumber(floor, position)).toBe(number);
  });
});

describe("planGrid", () => {
  it("10 andares × 4 = 40 unidades, de 101 a 1004", () => {
    const { toCreate } = planGrid(10, 4, []);
    expect(toCreate).toHaveLength(40);
    expect(toCreate[0].numero).toBe("101");
    expect(toCreate.at(-1)?.numero).toBe("1004");
  });

  it("gerar de novo não duplica nada", () => {
    const first = planGrid(10, 4, []).toCreate;
    expect(planGrid(10, 4, first).toCreate).toHaveLength(0);
  });

  it("aumentar o prédio cria só o que falta", () => {
    const first = planGrid(2, 2, []).toCreate;
    const { toCreate } = planGrid(3, 2, first);
    expect(toCreate.map((u) => u.numero)).toEqual(["301", "302"]);
  });

  it("diminuir o prédio aponta as unidades que ficaram fora", () => {
    const first = planGrid(3, 4, []).toCreate;
    const { outside } = planGrid(2, 3, first);
    expect(outside.map((u) => u.numero).sort()).toEqual(
      ["104", "204", "301", "302", "303", "304"].sort(),
    );
  });
});

describe("preço em reais", () => {
  it.each([
    ["R$ 450.000,00", 450000],
    ["450000", 450000],
    ["450.000", 450000],
    ["1.250.000,50", 1250000.5],
  ])("%s → %d", (text, value) => {
    expect(parseMoney(text)).toBe(value);
  });

  it("vazio é sem preço; texto é inválido", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("R$ ")).toBeNull();
    expect(parseMoney("caro")).toBe("invalid");
  });

  it("formata em reais", () => {
    expect(formatMoney(450000).replace(/\s/g, " ")).toBe("R$ 450.000,00");
    expect(formatMoney(null)).toBe("");
  });
});

describe("bulkUnitsSchema", () => {
  it("aplica tipologia e sob consulta em lote", () => {
    const parsed = bulkUnitsSchema.parse({
      unitIds: [ID],
      changes: { typologyId: ID, showPrice: false },
    });
    expect(parsed.changes).toMatchObject({ typologyId: ID, showPrice: false });
  });

  it("converte o preço", () => {
    const parsed = bulkUnitsSchema.parse({
      unitIds: [ID],
      changes: { price: "R$ 300.000,00" },
    });
    expect(parsed.changes.price).toBe(300000);
  });

  it.each([
    [{ unitIds: [], changes: { status: "vendido" } }],
    [{ unitIds: ["x"], changes: { status: "vendido" } }],
    [{ unitIds: [ID], changes: {} }],
    [{ unitIds: [ID], changes: { price: "caro" } }],
    [{ unitIds: Array(501).fill(ID), changes: { status: "vendido" } }],
  ])("recusa %#", (input) => {
    expect(bulkUnitsSchema.safeParse(input).success).toBe(false);
  });
});
