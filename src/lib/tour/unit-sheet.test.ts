import { describe, expect, it } from "vitest";

import { parseUnitParam, priceLabel, typologyRows } from "./unit-sheet";

describe("ficha da unidade", () => {
  it("preço público ou 'Sob consulta'", () => {
    expect(priceLabel(450000).replace(/\s/g, " ")).toBe("R$ 450.000,00");
    expect(priceLabel(null)).toBe("Sob consulta");
  });

  it("linhas da tipologia, sem suíte nem área quando não houver", () => {
    expect(
      typologyRows({
        nome: "Tipo A",
        quartos: 2,
        suites: 1,
        banheiros: 2,
        vagas: 1,
        area_privativa_m2: 65.5,
      }),
    ).toEqual([
      ["Planta", "Tipo A"],
      ["Quartos", "2 quartos"],
      ["Suítes", "1 suíte"],
      ["Banheiros", "2 banheiros"],
      ["Vagas", "1 vaga"],
      ["Área privativa", "65,5 m²"],
    ]);
    expect(
      typologyRows({
        nome: "Studio",
        quartos: 1,
        suites: 0,
        banheiros: 1,
        vagas: 0,
        area_privativa_m2: null,
      }).map(([label]) => label),
    ).toEqual(["Planta", "Quartos", "Banheiros", "Vagas"]);
    expect(typologyRows(null)).toEqual([]);
  });

  it("?unidade= do link", () => {
    expect(parseUnitParam("902")).toBe("902");
    expect(parseUnitParam(" 1004 ")).toBe("1004");
    expect(parseUnitParam("<script>")).toBeNull();
    expect(parseUnitParam(["1", "2"])).toBeNull();
    expect(parseUnitParam(undefined)).toBeNull();
  });
});
