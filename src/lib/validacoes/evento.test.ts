import { describe, expect, it } from "vitest";

import { eventSchema } from "./evento";

const base = {
  empreendimentoId: "0d3e0000-0000-4000-8000-000000000001",
  sessaoId: "abc123def456",
  tipo: "abriu_tour",
};

describe("evento de visita", () => {
  it("aceita os tipos do tour, com dados opcionais", () => {
    expect(eventSchema.parse(base).dados).toEqual({});
    expect(
      eventSchema.safeParse({
        ...base,
        tipo: "saiu",
        dados: { pagina: "unidade", segundos: 95 },
      }).success,
    ).toBe(true);
    expect(
      eventSchema.safeParse({
        ...base,
        tipo: "viu_comodo",
        unidadeId: "0d3e0000-0000-4000-8000-000000000101",
        comodoId: "0d3e0000-0000-4000-8000-000000010101",
        dados: { via: "etiqueta" },
      }).success,
    ).toBe(true);
  });

  it("recusa tipo desconhecido, chave extra e texto livre", () => {
    expect(
      eventSchema.safeParse({ ...base, tipo: "enviou_lead" }).success,
    ).toBe(false);
    expect(eventSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
    expect(
      eventSchema.safeParse({ ...base, dados: { nome: "Maria" } }).success,
    ).toBe(false);
    expect(
      eventSchema.safeParse({ ...base, dados: { segundos: -1 } }).success,
    ).toBe(false);
  });

  it("sessão e ids com formato fixo", () => {
    expect(eventSchema.safeParse({ ...base, sessaoId: "curta" }).success).toBe(
      false,
    );
    expect(
      eventSchema.safeParse({ ...base, sessaoId: "<script>alert(1)</script>" })
        .success,
    ).toBe(false);
    expect(
      eventSchema.safeParse({ ...base, empreendimentoId: "1 or 1=1" }).success,
    ).toBe(false);
  });
});
