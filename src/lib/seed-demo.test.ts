import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import dados from "../../supabase/seed/residencial-demo.json";
import { gerarSeedSql, gerarUnidades } from "../../scripts/seed/gerar-seed.mjs";
import { demoStatus } from "./building";
import {
  areaDoPoligono,
  geometriaComodoSchema,
  plantaSchema,
  type Ponto,
} from "./validacoes/planta";

// Garante que o prédio demo (supabase/seed/residencial-demo.json) é válido
// ANTES de chegar ao banco, e que o seed.sql está em dia com o JSON.

function caixa(pontos: Ponto[]) {
  const xs = pontos.map((p) => p[0]);
  const ys = pontos.map((p) => p[1]);
  return {
    x0: Math.min(...xs),
    x1: Math.max(...xs),
    y0: Math.min(...ys),
    y1: Math.max(...ys),
  };
}

describe("seed do prédio demo", () => {
  it("toda geometria de cômodo passa no esquema Zod", () => {
    for (const tipologia of dados.tipologias) {
      for (const comodo of tipologia.comodos) {
        const resultado = geometriaComodoSchema.safeParse(comodo.geometria);
        expect(resultado.success, `${tipologia.nome} / ${comodo.nome}`).toBe(
          true,
        );
      }
    }
  });

  it("toda planta passa no esquema Zod", () => {
    for (const tipologia of dados.tipologias) {
      expect(
        plantaSchema.safeParse(tipologia.planta).success,
        tipologia.nome,
      ).toBe(true);
    }
  });

  it("os cômodos de uma planta não se sobrepõem", () => {
    for (const tipologia of dados.tipologias) {
      const caixas = tipologia.comodos.map((c) => ({
        nome: c.nome,
        ...caixa(c.geometria.pontos as Ponto[]),
      }));
      for (let i = 0; i < caixas.length; i++) {
        for (let j = i + 1; j < caixas.length; j++) {
          const a = caixas[i];
          const b = caixas[j];
          const largura = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
          const altura = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
          const sobreposicao = largura > 0 && altura > 0 ? largura * altura : 0;
          expect(
            sobreposicao,
            `${tipologia.nome}: ${a.nome} × ${b.nome}`,
          ).toBeLessThan(0.001);
        }
      }
    }
  });

  it("a soma das áreas dos cômodos é coerente com a área privativa (±20%)", () => {
    for (const tipologia of dados.tipologias) {
      const soma = tipologia.comodos.reduce(
        (total, c) => total + areaDoPoligono(c.geometria.pontos as Ponto[]),
        0,
      );
      expect(
        soma / tipologia.area_privativa_m2,
        tipologia.nome,
      ).toBeGreaterThan(0.8);
      expect(soma / tipologia.area_privativa_m2, tipologia.nome).toBeLessThan(
        1.2,
      );
    }
  });

  it("gera 40 unidades com números únicos (10 andares × 4)", () => {
    const unidades = gerarUnidades(dados);
    expect(unidades).toHaveLength(40);
    expect(
      new Set(unidades.map((u: { numero: string }) => u.numero)).size,
    ).toBe(40);
  });

  it("os status batem com o prédio 3D de exemplo (demoStatus)", () => {
    for (const u of gerarUnidades(dados)) {
      expect(u.status, u.numero).toBe(demoStatus(u.andar, u.posicao));
    }
  });

  it("as coberturas (9º e 10º andares) são 'sob consulta'; as demais mostram preço", () => {
    for (const u of gerarUnidades(dados)) {
      expect(u.exibir_preco, u.numero).toBe(u.andar < 9);
    }
  });

  it("o supabase/seed.sql está em dia com o JSON (rode npm run db:seed:gerar)", () => {
    const atual = readFileSync("supabase/seed.sql", "utf8").replace(
      /\r\n/g,
      "\n",
    );
    expect(atual).toBe(gerarSeedSql(dados));
  });
});
