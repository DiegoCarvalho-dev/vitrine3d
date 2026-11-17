// @vitest-environment node
// (Sem navegador simulado: este teste lê arquivos do disco.)
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  generateSeedSql,
  generateUnits,
  readSeedData,
  SEED_SQL_URL,
} from "../../scripts/seed/gerar-seed.mjs";
import { demoStatus } from "./building";
import {
  floorPlanSchema,
  polygonArea,
  roomGeometrySchema,
  type Point,
} from "./validacoes/planta";

// Garante que o prédio demo (supabase/seed/residencial-demo.json) é válido e
// coerente ANTES de chegar ao banco, e que o seed.sql está em dia com o JSON.

type Room = { nome: string; geometria: { pontos: Point[] } };
type Segment = { de: Point; ate: Point };

const data = readSeedData();
const EPS = 1e-6;

/** Ponto dentro do polígono (ray casting). Serve também para polígonos em L. */
function contains(polygon: Point[], [x, y]: Point): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

/** Ponto sobre a borda do polígono (com tolerância). */
function onBoundary(polygon: Point[], [x, y]: Point): boolean {
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [x1, y1] = polygon[j];
    const [x2, y2] = polygon[i];
    const cross = (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1);
    if (Math.abs(cross) > EPS) continue;
    if (
      x >= Math.min(x1, x2) - EPS &&
      x <= Math.max(x1, x2) + EPS &&
      y >= Math.min(y1, y2) - EPS &&
      y <= Math.max(y1, y2) + EPS
    ) {
      return true;
    }
  }
  return false;
}

/** Retângulo que envolve a unidade inteira (a fachada fica nas bordas dele). */
function outline(rooms: Room[]) {
  const pts = rooms.flatMap((r) => r.geometria.pontos);
  return {
    x0: Math.min(...pts.map((p) => p[0])),
    x1: Math.max(...pts.map((p) => p[0])),
    y0: Math.min(...pts.map((p) => p[1])),
    y1: Math.max(...pts.map((p) => p[1])),
  };
}

/** Portas e passagens (janelas com peitoril 0 = porta-janela). */
function passages(plan: {
  portas: Segment[];
  janelas: (Segment & { peitoril: number })[];
}) {
  return [...plan.portas, ...plan.janelas.filter((j) => j.peitoril === 0)];
}

/** Para cada passagem, quais cômodos ela liga ("fora" = fachada). */
function connections(rooms: Room[], plan: Parameters<typeof passages>[0]) {
  const box = outline(rooms);
  return passages(plan).map((p) => {
    const mid: Point = [(p.de[0] + p.ate[0]) / 2, (p.de[1] + p.ate[1]) / 2];
    const touching = rooms
      .filter((r) => onBoundary(r.geometria.pontos, mid))
      .map((r) => r.nome);
    const facade =
      Math.abs(mid[0] - box.x0) < EPS ||
      Math.abs(mid[0] - box.x1) < EPS ||
      Math.abs(mid[1] - box.y0) < EPS ||
      Math.abs(mid[1] - box.y1) < EPS;
    return {
      touching:
        facade && touching.length === 1 ? [...touching, "fora"] : touching,
      mid,
    };
  });
}

describe("seed do prédio demo", () => {
  it("toda geometria de cômodo e toda planta passam no esquema Zod", () => {
    for (const t of data.tipologias) {
      expect(floorPlanSchema.safeParse(t.planta).success, t.nome).toBe(true);
      for (const room of t.comodos) {
        expect(
          roomGeometrySchema.safeParse(room.geometria).success,
          `${t.nome} / ${room.nome}`,
        ).toBe(true);
      }
    }
  });

  it("os cômodos não se sobrepõem (formato real, não só a caixa)", () => {
    for (const t of data.tipologias) {
      const rooms: Room[] = t.comodos;
      const box = outline(rooms);
      // Amostra o piso a cada 10 cm, no meio de cada célula (longe das bordas).
      for (let x = box.x0 + 0.05; x < box.x1; x += 0.1) {
        for (let y = box.y0 + 0.05; y < box.y1; y += 0.1) {
          const owners = rooms.filter((r) =>
            contains(r.geometria.pontos, [x, y]),
          );
          expect(
            owners.length,
            `${t.nome}: (${x.toFixed(2)}, ${y.toFixed(2)}) em ${owners.map((o) => o.nome).join(" e ")}`,
          ).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("a soma das áreas dos cômodos cabe na área privativa (80% a 100%, paredes incluídas)", () => {
    for (const t of data.tipologias) {
      const sum = t.comodos.reduce(
        (total: number, room: Room) =>
          total + polygonArea(room.geometria.pontos),
        0,
      );
      const ratio = sum / t.area_privativa_m2;
      expect(
        ratio,
        `${t.nome}: ${sum.toFixed(1)} m² de cômodos`,
      ).toBeGreaterThanOrEqual(0.8);
      expect(
        ratio,
        `${t.nome}: ${sum.toFixed(1)} m² de cômodos`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it("toda porta fica numa parede: entre dois cômodos ou na fachada", () => {
    for (const t of data.tipologias) {
      for (const c of connections(t.comodos, t.planta)) {
        expect(
          c.touching.length,
          `${t.nome}: porta em (${c.mid.join(", ")}) liga ${c.touching.join(" e ") || "nada"}`,
        ).toBe(2);
      }
    }
  });

  it("todo cômodo é alcançável a partir da entrada, passando pelas portas", () => {
    for (const t of data.tipologias) {
      const links = connections(t.comodos, t.planta).map((c) => c.touching);
      const reached = new Set(["fora"]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const [a, b] of links) {
          if (reached.has(a) !== reached.has(b)) {
            reached.add(a);
            reached.add(b);
            grew = true;
          }
        }
      }
      for (const room of t.comodos) {
        expect(
          reached.has(room.nome),
          `${t.nome}: ${room.nome} sem acesso`,
        ).toBe(true);
      }
    }
  });

  it("o banheiro da suíte só tem porta para a suíte", () => {
    for (const t of data.tipologias) {
      const doors = connections(t.comodos, t.planta).filter((c) =>
        c.touching.includes("Banheiro da suíte"),
      );
      expect(doors.length, t.nome).toBe(1);
      expect(doors[0].touching, t.nome).toContain("Suíte");
    }
  });

  it("gera 40 unidades com números únicos (10 andares × 4)", () => {
    const units = generateUnits(data);
    expect(units).toHaveLength(40);
    expect(new Set(units.map((u: { numero: string }) => u.numero)).size).toBe(
      40,
    );
  });

  it("os status batem com o prédio 3D de exemplo (demoStatus)", () => {
    for (const u of generateUnits(data)) {
      expect(u.status, u.numero).toBe(demoStatus(u.andar, u.posicao));
    }
  });

  it("as coberturas (9º e 10º andares) são 'sob consulta'; as demais mostram preço", () => {
    for (const u of generateUnits(data)) {
      expect(u.exibir_preco, u.numero).toBe(u.andar < 9);
    }
  });

  it("o gerador recusa dados inválidos antes de escrever o SQL", () => {
    const broken = structuredClone(data);
    broken.tipologias[0].comodos[0].geometria.pontos[0] = [-1, 0];
    delete broken.unidades.tipologia_por_posicao["1"];
    expect(() => generateSeedSql(broken)).toThrow(
      /geometria inválida[\s\S]*posição 1 sem tipologia/,
    );
  });

  it("o supabase/seed.sql está em dia com o JSON (rode npm run db:seed:gerar)", () => {
    const current = readFileSync(SEED_SQL_URL, "utf8").replace(/\r\n/g, "\n");
    expect(current).toBe(generateSeedSql(data));
  });
});
