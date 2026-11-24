import { describe, expect, it } from "vitest";

import { rectToPolygon } from "./geometry";
import {
  carryOpenings,
  type DraftOpening,
  nearestWall,
  openingsFromPlan,
  overlappingOpenings,
  placeOnWall,
  planFromOpenings,
  planProblem,
  slideOpening,
  wallOf,
  wallRule,
  wallsOf,
  widthOf,
} from "./openings";

// Sala 0..4 × 0..3 e quarto 4..7 × 0..3: parede comum em x = 4.
const rooms = [
  {
    id: "sala",
    type: "sala" as const,
    points: rectToPolygon({ x: 0, y: 0, width: 4, depth: 3 }),
    height: 2.7,
  },
  {
    id: "quarto",
    type: "quarto" as const,
    points: rectToPolygon({ x: 4, y: 0, width: 3, depth: 3 }),
    height: 2.7,
  },
];
const walls = wallsOf(rooms);
const shared = walls.find((w) => w.rooms.length === 2)!;

describe("portas e janelas no editor (#106)", () => {
  it("acha a parede perto do toque, ou nenhuma se longe", () => {
    expect(nearestWall(walls, [4.1, 1.5], 0.3)).toBe(shared);
    expect(nearestWall(walls, [2, 1.5], 0.3)).toBeNull();
  });

  it("encaixa a peça centrada no toque, sem passar das pontas", () => {
    // Centro encaixado de 5 em 5 cm: 1,52 → 1,50.
    expect(placeOnWall(shared, [4, 1.52], 0.8)).toEqual({
      a: [4, 1.1],
      b: [4, 1.9],
    });
    // Perto da ponta: encosta a 5 cm do fim.
    expect(placeOnWall(shared, [4, 0], 0.8)).toEqual({
      a: [4, 0.05],
      b: [4, 0.85],
    });
    // Parede curta: a peça encolhe; curta demais (< 0,5 m): não cabe.
    const short = {
      ...shared,
      a: [4, 0] as [number, number],
      b: [4, 0.4] as [number, number],
    };
    expect(placeOnWall(short, [4, 0.2], 0.8)).toBeNull();
  });

  it("janela só em parede externa; porta de vidro em qualquer uma", () => {
    expect(wallRule("janela", shared)).toContain("parede externa");
    expect(wallRule("vidro", shared)).toBeNull();
    const exterior = walls.find((w) => w.rooms.length === 1)!;
    expect(wallRule("janela", exterior)).toBeNull();
  });

  it("arrasta ao longo da parede, sem sair dela", () => {
    const door: DraftOpening = {
      key: "p",
      kind: "porta",
      a: [4, 1],
      b: [4, 1.8],
      sill: 0,
      height: 2.1,
    };
    const moved = slideOpening(walls, door, [4.4, 2.6]);
    expect(moved.a[0]).toBe(4);
    expect(widthOf(moved)).toBe(0.8);
    expect(moved.b[1]).toBeLessThanOrEqual(2.95);
  });

  it("mover o cômodo leva as portas e janelas das paredes dele", () => {
    const window: DraftOpening = {
      key: "j",
      kind: "janela",
      a: [7, 1],
      b: [7, 2],
      sill: 1,
      height: 1.2,
    };
    const onSala: DraftOpening = { ...window, key: "s", a: [0, 1], b: [0, 2] };
    const [movedWindow, stayed] = carryOpenings(
      [window, onSala],
      rooms[1].points,
      1,
      0,
    );
    expect(movedWindow.a).toEqual([8, 1]);
    expect(stayed.a).toEqual([0, 1]);
  });

  it("sem portas salvas, as automáticas viram editáveis; e volta ao formato salvo", () => {
    const openings = openingsFromPlan(rooms, {
      portas: [],
      janelas: [{ de: [7, 1], ate: [7, 2], peitoril: 1, altura: 1.2 }],
    });
    expect(openings.filter((o) => o.kind === "porta")).toHaveLength(1);
    expect(wallOf(walls, openings[0])).toBe(shared);
    const { plan, dropped } = planFromOpenings(rooms, [
      ...openings,
      // Fora das paredes: sai ao salvar.
      { key: "x", kind: "porta", a: [2, 1], b: [2, 1.8], sill: 0, height: 2.1 },
    ]);
    expect(dropped).toBe(1);
    expect(plan.portas).toHaveLength(1);
    expect(plan.janelas).toEqual([
      { de: [7, 1], ate: [7, 2], peitoril: 1, altura: 1.2 },
    ]);
    expect(planProblem(rooms, plan)).toBeNull();
  });

  it("planta sem portas por escolha continua sem portas (só a ponte de acesso)", () => {
    // Sala + quarto ligados por uma porta de vidro: sem a porta comum.
    const glass = {
      de: [4, 0.5],
      ate: [4, 2.5],
      peitoril: 0,
      altura: 2.1,
    } as const;
    const plan = {
      portas: [],
      janelas: [{ ...glass, de: [...glass.de], ate: [...glass.ate] }],
      portas_definidas: true,
    } as Parameters<typeof openingsFromPlan>[1];
    const openings = openingsFromPlan(rooms, plan);
    expect(openings.filter((o) => o.kind === "porta")).toHaveLength(0);
    // Sem a marca (planta antiga): portas automáticas.
    expect(
      openingsFromPlan(rooms, { portas: [], janelas: [] }).filter(
        (o) => o.kind === "porta",
      ),
    ).toHaveLength(1);
    expect(planFromOpenings(rooms, []).plan.portas_definidas).toBe(true);
  });

  it("duas peças no mesmo lugar são recusadas", () => {
    expect(
      overlappingOpenings([
        { key: "a", a: [4, 1], b: [4, 1.8] },
        { key: "b", a: [4, 1.5], b: [4, 2.3] },
        { key: "c", a: [4, 2.4], b: [4, 2.9] }, // encostada: tudo bem
      ]),
    ).toEqual(new Set(["a", "b"]));
    expect(
      planProblem(rooms, {
        portas: [
          { de: [4, 1], ate: [4, 1.8] },
          { de: [4, 1.2], ate: [4, 2] },
        ],
        janelas: [],
      }),
    ).toContain("mesmo lugar");
  });

  it("o servidor recusa porta fora da parede e janela em parede interna", () => {
    expect(
      planProblem(rooms, {
        portas: [{ de: [2, 1], ate: [2, 1.8] }],
        janelas: [],
      }),
    ).toContain("porta fora das paredes");
    expect(
      planProblem(rooms, {
        portas: [],
        janelas: [{ de: [4, 1], ate: [4, 2], peitoril: 1, altura: 1.2 }],
      }),
    ).toContain("parede externa");
    // Porta de vidro (peitoril 0) na parede interna: pode.
    expect(
      planProblem(rooms, {
        portas: [],
        janelas: [{ de: [4, 1], ate: [4, 2.6], peitoril: 0, altura: 2.1 }],
      }),
    ).toBeNull();
  });
});
