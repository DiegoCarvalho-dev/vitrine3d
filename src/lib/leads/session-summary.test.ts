import { describe, expect, it } from "vitest";

import { durationLabel, summarizeSession } from "./session-summary";

const event = (
  tipo: string,
  criado_em: string,
  extra: Partial<{ unidade: string; comodo: string; segundos: number }> = {},
) => ({
  tipo,
  criado_em,
  unidade: extra.unidade ?? null,
  comodo: extra.comodo ?? null,
  segundos: extra.segundos ?? null,
});

describe("resumo da visita", () => {
  it("unidades mais vistas primeiro, cômodos sem repetir, tempo, caminhou e dias", () => {
    const summary = summarizeSession([
      event("abriu_tour", "2026-11-20T10:00:00Z"),
      event("abriu_unidade", "2026-11-20T10:01:00Z", { unidade: "101" }),
      event("abriu_unidade", "2026-11-20T10:02:00Z", { unidade: "902" }),
      event("abriu_unidade", "2026-11-21T09:00:00Z", { unidade: "902" }),
      event("viu_comodo", "2026-11-21T09:01:00Z", {
        unidade: "902",
        comodo: "Sala",
      }),
      event("viu_comodo", "2026-11-21T09:02:00Z", {
        unidade: "902",
        comodo: "Sala",
      }),
      event("viu_comodo", "2026-11-21T09:03:00Z", {
        unidade: "902",
        comodo: "Suíte",
      }),
      event("caminhou", "2026-11-21T09:04:00Z", { unidade: "902" }),
      event("saiu", "2026-11-21T09:10:00Z", { segundos: 300 }),
      event("saiu", "2026-11-20T10:05:00Z", { segundos: 120 }),
    ]);
    expect(summary).toEqual({
      units: ["902", "101"],
      rooms: ["Sala", "Suíte"],
      seconds: 420,
      walked: true,
      walkedIn: "902",
      days: 2,
    });
  });

  it('visita às 21 h de Brasília não vira "2 dias" (dia contado no fuso do Brasil)', () => {
    expect(
      summarizeSession([
        event("abriu_tour", "2026-11-20T23:50:00Z"), // 20:50 em Brasília
        event("abriu_tour", "2026-11-21T00:10:00Z"), // 21:10 em Brasília
      ]).days,
    ).toBe(1);
  });

  it("duração em linguagem simples", () => {
    expect(durationLabel(45)).toBe("45 s");
    expect(durationLabel(480)).toBe("8 min");
    expect(durationLabel(3900)).toBe("1 h 05 min");
  });
});
