import { describe, expect, it } from "vitest";

import { slugify } from "../slugify";
import { createProjectSchema, SLUG_PATTERN } from "./empreendimento";

const building = {
  type: "predio" as const,
  name: "Edifício Solar",
  slug: "edificio-solar",
  city: "São Paulo",
  state: "SP" as const,
  floors: "10",
  unitsPerFloor: "4",
};

describe("createProjectSchema", () => {
  it("aceita um prédio e converte andares/unidades para número", () => {
    const parsed = createProjectSchema.parse(building);
    expect(parsed.floors).toBe(10);
    expect(parsed.unitsPerFloor).toBe(4);
  });

  it("casa não tem andares nem unidades por andar", () => {
    const parsed = createProjectSchema.parse({
      ...building,
      type: "casa",
      floors: "",
      unitsPerFloor: "",
    });
    expect(parsed.floors).toBeNull();
    expect(parsed.unitsPerFloor).toBeNull();
  });

  it("prédio exige andares e unidades por andar, com mensagem no campo certo", () => {
    const result = createProjectSchema.safeParse({
      ...building,
      floors: "",
      unitsPerFloor: "0",
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["floors", "unitsPerFloor"]));
    expect(result.error?.issues[0].message).toBe(
      "Informe o número de andares.",
    );
  });

  it.each([
    ["201", "andares acima de 200"],
    ["2.5", "andar quebrado"],
    ["dez", "texto"],
  ])("recusa andares = %s (%s)", (floors) => {
    expect(createProjectSchema.safeParse({ ...building, floors }).success).toBe(
      false,
    );
  });

  it.each([
    ["Edifício Solar"],
    ["edificio--solar"],
    ["-solar"],
    ["solar-"],
    ["solar_1"],
  ])("recusa o link %s", (slug) => {
    expect(createProjectSchema.safeParse({ ...building, slug }).success).toBe(
      false,
    );
  });

  it("recusa UF que não existe", () => {
    expect(
      createProjectSchema.safeParse({ ...building, state: "XX" }).success,
    ).toBe(false);
  });
});

describe("slugify gera links válidos para o banco", () => {
  it.each([
    ["Residencial Águas Claras – Torre 2"],
    ["Edifício São João"],
    ["Casa 10!"],
  ])("%s", (name) => {
    expect(slugify(name)).toMatch(SLUG_PATTERN);
  });
});
