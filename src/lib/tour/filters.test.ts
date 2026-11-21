import { describe, expect, it } from "vitest";

import {
  countMatches,
  filtersToSearch,
  foundLabel,
  hasActiveFilters,
  hasInvertedRange,
  matchesFilters,
  NO_FILTERS,
  normalizeFilters,
  parseFilters,
  type FilterUnit,
} from "./filters";

const unit = (over: Partial<FilterUnit> = {}): FilterUnit => ({
  andar: 5,
  status: "disponivel",
  quartos: 3,
  preco: 450000,
  ...over,
});

describe("matchesFilters", () => {
  it("sem filtros, tudo passa", () => {
    expect(matchesFilters(unit(), NO_FILTERS)).toBe(true);
  });

  it("quartos: só a mesma quantidade; sem tipologia não passa", () => {
    expect(
      matchesFilters(unit({ quartos: 3 }), { ...NO_FILTERS, bedrooms: 3 }),
    ).toBe(true);
    expect(
      matchesFilters(unit({ quartos: 2 }), { ...NO_FILTERS, bedrooms: 3 }),
    ).toBe(false);
    expect(
      matchesFilters(unit({ quartos: null }), { ...NO_FILTERS, bedrooms: 3 }),
    ).toBe(false);
  });

  it("faixa de preço e andar incluem as pontas", () => {
    const f = {
      ...NO_FILTERS,
      minPrice: 400000,
      maxPrice: 450000,
      minFloor: 5,
      maxFloor: 5,
    };
    expect(matchesFilters(unit(), f)).toBe(true);
    expect(matchesFilters(unit({ preco: 450001 }), f)).toBe(false);
    expect(matchesFilters(unit({ preco: 399999 }), f)).toBe(false);
    expect(matchesFilters(unit({ andar: 4 }), f)).toBe(false);
    expect(matchesFilters(unit({ andar: 6 }), f)).toBe(false);
  });

  it("'sob consulta' passa em qualquer faixa de preço", () => {
    expect(
      matchesFilters(unit({ preco: null }), { ...NO_FILTERS, maxPrice: 100 }),
    ).toBe(true);
    expect(
      matchesFilters(unit({ preco: null }), { ...NO_FILTERS, minPrice: 9e9 }),
    ).toBe(true);
  });

  it("só disponíveis", () => {
    const f = { ...NO_FILTERS, onlyAvailable: true };
    expect(matchesFilters(unit({ status: "reservado" }), f)).toBe(false);
    expect(matchesFilters(unit({ status: "vendido" }), f)).toBe(false);
    expect(matchesFilters(unit(), f)).toBe(true);
  });
});

describe("URL", () => {
  it("lê o link do corretor e volta igual", () => {
    const filters = parseFilters({
      quartos: "3",
      ate: "500000",
      andar_de: "4",
      disponiveis: "1",
    });
    expect(filters).toEqual({
      bedrooms: 3,
      maxPrice: 500000,
      minFloor: 4,
      onlyAvailable: true,
    });
    expect(filtersToSearch(filters)).toBe(
      "quartos=3&ate=500000&andar_de=4&disponiveis=1",
    );
  });

  it("ignora o que for inválido, repetido ou vazio", () => {
    const filters = parseFilters({
      quartos: "abc",
      de: "-5",
      ate: ["1", "2"],
      andar_de: "",
      andar_ate: "9999",
      disponiveis: "0",
    });
    expect(filters).toEqual({ onlyAvailable: false });
    expect(hasActiveFilters(filters)).toBe(false);
  });
});

describe("contador", () => {
  it("conta e concorda no singular/plural", () => {
    const units = [unit(), unit({ quartos: 2 }), unit({ preco: null })];
    expect(countMatches(units, { ...NO_FILTERS, bedrooms: 3 })).toBe(2);
    expect(foundLabel(0)).toBe("Nenhuma unidade encontrada");
    expect(foundLabel(1)).toBe("1 unidade encontrada");
    expect(foundLabel(12)).toBe("12 unidades encontradas");
  });
});

describe("normalizeFilters (link editado à mão)", () => {
  const limits = { bedroomOptions: [2, 3], maxFloor: 10 };

  it("descarta o que não tem opção e troca faixa invertida", () => {
    expect(
      normalizeFilters(
        {
          onlyAvailable: false,
          bedrooms: 7,
          minFloor: 50,
          minPrice: 900000,
          maxPrice: 300000,
        },
        limits,
      ),
    ).toEqual({ onlyAvailable: false, minPrice: 300000, maxPrice: 900000 });
  });

  it("mantém o que está certo", () => {
    const ok = { onlyAvailable: true, bedrooms: 3, minFloor: 2, maxFloor: 8 };
    expect(normalizeFilters(ok, limits)).toEqual(ok);
  });

  it("avisa quando a faixa digitada está invertida", () => {
    expect(
      hasInvertedRange({ onlyAvailable: false, minPrice: 5, maxPrice: 1 }),
    ).toBe(true);
    expect(
      hasInvertedRange({ onlyAvailable: false, minFloor: 1, maxFloor: 5 }),
    ).toBe(false);
  });
});
