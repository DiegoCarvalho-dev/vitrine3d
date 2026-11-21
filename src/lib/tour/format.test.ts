import { describe, expect, it } from "vitest";

import {
  checkedAtLabel,
  deliveryLabel,
  lowestPublicPrice,
  statusCounts,
} from "./format";

describe("textos do tour", () => {
  it("sem data de entrega = pronto para morar", () => {
    expect(deliveryLabel(null)).toBe("Pronto para morar");
    expect(deliveryLabel("2028-06-30")).toBe(
      "Entrega prevista para junho de 2028",
    );
  });

  it("informações conferidas (sem pular de dia por fuso)", () => {
    expect(checkedAtLabel("2026-11-01")).toBe(
      "Informações conferidas em 1 de novembro de 2026",
    );
    expect(checkedAtLabel(null)).toBeNull();
  });

  it("conta unidades por status", () => {
    expect(
      statusCounts([
        { status: "disponivel" },
        { status: "vendido" },
        { status: "disponivel" },
      ]),
    ).toEqual({ disponivel: 2, reservado: 0, vendido: 1 });
  });

  it("'a partir de' ignora sob consulta e vendidas", () => {
    expect(
      lowestPublicPrice([
        { preco_publico: 300000, status: "vendido" },
        { preco_publico: null, status: "disponivel" },
        { preco_publico: 450000, status: "disponivel" },
        { preco_publico: 420000, status: "reservado" },
      ]),
    ).toBe(420000);
    expect(
      lowestPublicPrice([{ preco_publico: null, status: "disponivel" }]),
    ).toBeNull();
  });
});
