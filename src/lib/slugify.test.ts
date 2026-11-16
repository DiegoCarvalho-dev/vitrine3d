import { describe, expect, it } from "vitest";

import { slugify } from "./slugify";

describe("slugify", () => {
  it("deixa minúsculo e troca espaços por hífen", () => {
    expect(slugify("Edifício Solar")).toBe("edificio-solar");
  });

  it("remove acentos e cedilha", () => {
    expect(slugify("Ação Ônibus Pão Açaí")).toBe("acao-onibus-pao-acai");
  });

  it("junta símbolos e espaços repetidos num hífen só", () => {
    expect(slugify("Residencial  Águas Claras – Torre 2")).toBe(
      "residencial-aguas-claras-torre-2",
    );
  });

  it("tira hífens do começo e do fim", () => {
    expect(slugify("  --Casa 10!--  ")).toBe("casa-10");
  });

  it("gera só caracteres permitidos na URL (a-z, 0-9, -)", () => {
    expect(slugify("Apto #902 / Bloco B (vista mar)")).toMatch(/^[a-z0-9-]+$/);
  });

  it("devolve vazio quando não sobra nenhum caractere válido", () => {
    expect(slugify("!!! ###")).toBe("");
  });
});
