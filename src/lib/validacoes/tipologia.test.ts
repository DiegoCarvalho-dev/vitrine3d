import { describe, expect, it } from "vitest";

import { formatDecimal, parseDecimal } from "./numero";
import { copyName, typologySchema } from "./tipologia";

const valid = {
  name: "Tipo A",
  bedrooms: "2",
  suites: "1",
  bathrooms: "2",
  parkingSpots: "1",
  privateArea: "65,5",
};

describe("parseDecimal", () => {
  it.each([
    ["65", 65],
    ["65,5", 65.5],
    ["65.5", 65.5],
    ["1.234,56", 1234.56],
    [" 3,25 ", 3.25],
  ])("%s → %d", (text, value) => {
    expect(parseDecimal(text)).toBe(value);
  });

  it.each([[""], ["abc"], ["1e3"], ["-5"], ["5,5,5"]])("recusa %s", (text) => {
    expect(parseDecimal(text)).toBeNull();
  });

  it("formatDecimal volta com vírgula", () => {
    expect(formatDecimal(65.5)).toBe("65,5");
    expect(formatDecimal(null)).toBe("");
  });
});

describe("typologySchema", () => {
  it("aceita e converte os números", () => {
    expect(typologySchema.parse(valid)).toEqual({
      name: "Tipo A",
      bedrooms: 2,
      suites: 1,
      bathrooms: 2,
      parkingSpots: 1,
      privateArea: 65.5,
    });
  });

  it("área vazia é opcional (null)", () => {
    expect(
      typologySchema.parse({ ...valid, privateArea: "" }).privateArea,
    ).toBeNull();
  });

  it.each([
    ["bedrooms", "21"],
    ["bedrooms", "-1"],
    ["suites", "1,5"],
    ["privateArea", "0"],
    ["privateArea", "abc"],
    ["name", ""],
  ])("recusa %s = %s", (field, value) => {
    const result = typologySchema.safeParse({ ...valid, [field]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path[0]).toBe(field);
  });
});

describe("copyName", () => {
  it("cria (cópia), depois (cópia 2)", () => {
    expect(copyName("Tipo A", ["Tipo A"])).toBe("Tipo A (cópia)");
    expect(copyName("Tipo A", ["Tipo A", "Tipo A (cópia)"])).toBe(
      "Tipo A (cópia 2)",
    );
  });

  it("respeita o limite de 60 caracteres", () => {
    const long = "x".repeat(60);
    expect(copyName(long, [long]).length).toBeLessThanOrEqual(60);
  });
});
