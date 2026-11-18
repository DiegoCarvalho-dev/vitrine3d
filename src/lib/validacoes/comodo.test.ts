import { describe, expect, it } from "vitest";

import { rectGeometry, roomFormSchema } from "./comodo";

const sala = {
  name: "Sala",
  type: "sala",
  description: "",
  x: "0",
  y: "0",
  width: "5",
  depth: "4",
  ceilingHeight: "2,7",
};

describe("roomFormSchema", () => {
  it("aceita vírgula e converte para metros", () => {
    const data = roomFormSchema.parse({ ...sala, width: "3,5" });
    expect(data.width).toBe(3.5);
    expect(data.ceilingHeight).toBe(2.7);
    expect(data.description).toBeNull();
  });

  it.each([
    ["width", "0,2", "largura"],
    ["x", "-1", "posição X"],
    ["ceilingHeight", "1,9", "pé-direito"],
    ["depth", "abc", "profundidade"],
    ["name", "", "nome"],
  ])("recusa %s = %s", (field, value, word) => {
    const result = roomFormSchema.safeParse({ ...sala, [field]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message.toLowerCase()).toContain(
      word.toLowerCase(),
    );
  });

  it.each([
    ["2.750", 2.75],
    ["2,75", 2.75],
    ["1.250", 1.25],
  ])("em metros, ponto é sempre decimal: %s → %d", (text, value) => {
    expect(roomFormSchema.parse({ ...sala, width: text }).width).toBe(value);
  });

  it("não deixa passar de 100 m", () => {
    const result = roomFormSchema.safeParse({ ...sala, x: "98", width: "5" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path[0]).toBe("width");
  });

  it("vira um polígono válido para o banco", () => {
    const data = roomFormSchema.parse(sala);
    expect(rectGeometry(data)).toEqual({
      tipo: "poligono",
      pontos: [
        [0, 0],
        [5, 0],
        [5, 4],
        [0, 4],
      ],
      pe_direito: 2.7,
    });
  });
});
