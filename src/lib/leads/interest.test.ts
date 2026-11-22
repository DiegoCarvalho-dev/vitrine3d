import { describe, expect, it } from "vitest";

import { interestLine, interestOf } from "./interest";
import type { SessionSummary } from "./session-summary";

const base: SessionSummary = {
  units: [],
  rooms: [],
  seconds: 0,
  walked: false,
  walkedIn: null,
  days: 1,
};
const summary = (over: Partial<SessionSummary>): SessionSummary => ({
  ...base,
  ...over,
});

describe("termômetro de interesse", () => {
  it("sem eventos: frio, sem erro, com o motivo", () => {
    expect(interestOf(null)).toEqual({
      level: "frio",
      points: 0,
      reasons: ["sem registro da visita no tour"],
    });
  });

  it("olhou pouco: frio", () => {
    const interest = interestOf(summary({ seconds: 40, units: ["101"] }));
    expect(interest.level).toBe("frio");
    expect(interest.reasons).toEqual(["olhou pouco o tour"]);
  });

  it("cada regra vale os pontos combinados", () => {
    expect(interestOf(summary({ seconds: 300 })).points).toBe(2);
    expect(interestOf(summary({ seconds: 600 })).points).toBe(3);
    expect(interestOf(summary({ seconds: 299 })).points).toBe(0);
    expect(interestOf(summary({ units: ["1", "2"] })).points).toBe(1);
    expect(interestOf(summary({ units: ["1", "2", "3"] })).points).toBe(2);
    expect(interestOf(summary({ rooms: ["a", "b"] })).points).toBe(0);
    expect(interestOf(summary({ rooms: ["a", "b", "c"] })).points).toBe(1);
    expect(interestOf(summary({ walked: true })).points).toBe(2);
    expect(interestOf(summary({ days: 2 })).points).toBe(2);
    expect(interestOf(summary({ days: 3 })).points).toBe(3);
  });

  it("faixas: frio até 2, morno de 3 a 5, quente a partir de 6", () => {
    expect(interestOf(summary({ walked: true })).level).toBe("frio"); // 2
    expect(interestOf(summary({ walked: true, units: ["1", "2"] })).level).toBe(
      "morno",
    ); // 3
    expect(interestOf(summary({ walked: true, seconds: 600 })).level).toBe(
      "morno",
    ); // 5
    expect(
      interestOf(summary({ walked: true, seconds: 600, units: ["1", "2"] }))
        .level,
    ).toBe("quente"); // 6
  });

  it("o caso do corretor: 8 min, caminhou na 902, voltou em outro dia", () => {
    const interest = interestOf(
      summary({
        seconds: 480,
        walked: true,
        walkedIn: "902",
        days: 2,
        units: ["902"],
        rooms: ["Sala", "Suíte", "Varanda"],
      }),
    );
    expect(interest.level).toBe("quente"); // 2 + 2 + 2 + 1 = 7
    expect(interest.points).toBe(7);
    expect(interestLine(interest)).toBe(
      "Quente: voltou em outro dia, caminhou por dentro da unidade 902, ficou 8 min no tour",
    );
  });

  it("motivos: os mais fortes primeiro e no máximo 3 na frase", () => {
    const interest = interestOf(
      summary({
        days: 3,
        seconds: 700,
        walked: true,
        units: ["1", "2", "3"],
        rooms: ["a", "b", "c"],
      }),
    );
    expect(interest.reasons[0]).toBe("voltou em 3 dias diferentes");
    expect(interestLine(interest).split(", ")).toHaveLength(3);
  });
});
