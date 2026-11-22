import { describe, expect, it } from "vitest";

import {
  compare,
  headline,
  monthPeriod,
  parseSummary,
  totalsOf,
} from "./summary";

const project = (
  over: Partial<ReturnType<typeof parseSummary>[number]> = {},
) => ({
  empreendimento_id: "0d3e0000-0000-4000-8000-000000000001",
  nome: "Residencial A",
  visitas: 10,
  caminharam: 4,
  cliques_whatsapp: 3,
  leads: 2,
  unidades: [{ numero: "902", vezes: 5 }],
  comodos: [{ nome: "Sala", vezes: 7 }],
  ...over,
});

describe("resumo do mês", () => {
  it("mês em horário de Brasília (UTC−3)", () => {
    // 22/11/2026 14:00 UTC = 11:00 em Brasília.
    const now = new Date("2026-11-22T14:00:00Z");
    expect(monthPeriod(now).from.toISOString()).toBe(
      "2026-11-01T03:00:00.000Z",
    );
    expect(monthPeriod(now).to.toISOString()).toBe("2026-12-01T03:00:00.000Z");
    expect(monthPeriod(now, 1).from.toISOString()).toBe(
      "2026-10-01T03:00:00.000Z",
    );
    expect(monthPeriod(now, 1).to.toISOString()).toBe(
      "2026-11-01T03:00:00.000Z",
    );
  });

  it("1º do mês às 01h de Brasília ainda é o mês novo (e 31 às 23h, o antigo)", () => {
    // 01/12 01:00 BRT = 01/12 04:00 UTC → dezembro.
    expect(
      monthPeriod(new Date("2026-12-01T04:00:00Z")).from.toISOString(),
    ).toBe("2026-12-01T03:00:00.000Z");
    // 01/12 00:30 UTC = 30/11 21:30 BRT → ainda novembro.
    expect(
      monthPeriod(new Date("2026-12-01T00:30:00Z")).from.toISOString(),
    ).toBe("2026-11-01T03:00:00.000Z");
  });

  it("virada de ano e mês anterior de janeiro", () => {
    const january = new Date("2027-01-15T12:00:00Z");
    expect(monthPeriod(january).from.toISOString()).toBe(
      "2027-01-01T03:00:00.000Z",
    );
    expect(monthPeriod(january, 1).from.toISOString()).toBe(
      "2026-12-01T03:00:00.000Z",
    );
  });

  it("totais somam os empreendimentos", () => {
    expect(
      totalsOf([
        project(),
        project({ visitas: 5, leads: 1, caminharam: 1, cliques_whatsapp: 0 }),
      ]),
    ).toEqual({ visits: 15, leads: 3, whatsappClicks: 3, walked: 5 });
    expect(totalsOf([])).toEqual({
      visits: 0,
      leads: 0,
      whatsappClicks: 0,
      walked: 0,
    });
  });

  it("comparação com o mês passado", () => {
    expect(compare(15, 10)).toEqual({
      difference: 5,
      label: "+50% sobre o mês passado",
    });
    expect(compare(9, 10)).toEqual({
      difference: -1,
      label: "−10% sobre o mês passado",
    });
    expect(compare(10, 10)).toEqual({
      difference: 0,
      label: "igual ao mês passado",
    });
    // Mês passado zerado: sem porcentagem (não dá para dividir por zero).
    expect(compare(7, 0)).toEqual({ difference: 7, label: null });
  });

  it("frase do resumo, no singular e no plural", () => {
    expect(
      headline(
        { visits: 340, leads: 12, whatsappClicks: 0, walked: 0 },
        "novembro",
      ),
    ).toBe("Seu tour gerou 12 contatos e 340 visitas em novembro.");
    expect(
      headline(
        { visits: 1, leads: 1, whatsappClicks: 0, walked: 0 },
        "outubro",
      ),
    ).toBe("Seu tour gerou 1 contato e 1 visita em outubro.");
  });

  it("JSON do banco: válido passa; lixo vira lista vazia", () => {
    expect(parseSummary([project()])).toHaveLength(1);
    expect(parseSummary(null)).toEqual([]);
    expect(parseSummary([{ nome: "sem os campos" }])).toEqual([]);
    expect(parseSummary("texto")).toEqual([]);
  });
});
