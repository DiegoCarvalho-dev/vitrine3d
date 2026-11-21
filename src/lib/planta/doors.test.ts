import { describe, expect, it } from "vitest";

import seed from "../../../supabase/seed/residencial-demo.json";
import type { RoomType } from "@/lib/validacoes/comodo";
import type { Point } from "@/lib/validacoes/planta";

import {
  type DoorRoom,
  onSegment,
  planDoors,
  roomsReachable,
  sharedRuns,
} from "./doors";
import { buildWalls, wallLength, wallPieces } from "./walls";

const rect = (
  id: string,
  type: RoomType,
  x: number,
  y: number,
  w: number,
  d: number,
): DoorRoom => ({
  id,
  type,
  height: 2.7,
  points: [
    [x, y],
    [x + w, y],
    [x + w, y + d],
    [x, y + d],
  ],
});

const between = (
  doors: { a: Point; b: Point }[],
  rooms: DoorRoom[],
  x: string,
  y: string,
) =>
  doors.filter((door) => {
    const mid: Point = [
      (door.a[0] + door.b[0]) / 2,
      (door.a[1] + door.b[1]) / 2,
    ];
    return sharedRuns(rooms).some(
      (run) =>
        run.rooms
          .map((r) => r.id)
          .sort()
          .join() === [x, y].sort().join() && onSegment(run.a, run.b, mid),
    );
  });

describe("portas automáticas", () => {
  it("vão de 0,8 m no meio da parede comum", () => {
    const rooms = [
      rect("sala", "sala", 0, 0, 4, 3),
      rect("q", "quarto", 4, 0, 3, 3),
    ];
    const [door] = planDoors(rooms);
    expect(door).toEqual({ a: [4, 1.1], b: [4, 1.9] });
  });

  it("trecho comum menor que 0,9 m: sem porta", () => {
    const rooms = [
      rect("sala", "sala", 0, 0, 4, 3),
      rect("q", "quarto", 4, 2.2, 3, 3),
    ];
    expect(planDoors(rooms)).toEqual([]);
  });

  it("banheiro abre para um cômodo só (a suíte antes da circulação)", () => {
    const rooms = [
      rect("hall", "outro", 0, 0, 6, 1),
      rect("wc", "banheiro", 0, 1, 2, 3),
      rect("suite", "suite", 2, 1, 4, 3),
    ];
    const doors = planDoors(rooms);
    expect(between(doors, rooms, "wc", "suite")).toHaveLength(1);
    expect(between(doors, rooms, "wc", "hall")).toHaveLength(0);
    expect(between(doors, rooms, "suite", "hall")).toHaveLength(1);
  });

  it("varanda abre para a sala, não para a cozinha", () => {
    const rooms = [
      rect("varanda", "varanda", 0, 0, 8, 1.5),
      rect("sala", "sala", 0, 1.5, 5, 3),
      rect("cozinha", "cozinha", 5, 1.5, 3, 3),
    ];
    const doors = planDoors(rooms);
    expect(between(doors, rooms, "varanda", "sala")).toHaveLength(1);
    expect(between(doors, rooms, "varanda", "cozinha")).toHaveLength(0);
  });

  it("porta salva fora das paredes (cômodo editado) cai e volta a automática", () => {
    const rooms = [
      rect("sala", "sala", 0, 0, 4, 3),
      rect("q", "quarto", 4, 0, 3, 3),
    ];
    const stale = [{ de: [5, 1] as Point, ate: [5, 1.8] as Point }];
    expect(planDoors(rooms, stale)).toEqual([{ a: [4, 1.1], b: [4, 1.9] }]);
  });

  it("porta de vidro (passagem) dispensa outra porta no mesmo par", () => {
    const rooms = [
      rect("varanda", "varanda", 0, 0, 5, 1.5),
      rect("sala", "sala", 0, 1.5, 5, 3),
    ];
    const glass = [{ a: [0.5, 1.5] as Point, b: [4.5, 1.5] as Point }];
    expect(planDoors(rooms, [], glass)).toEqual([]);
  });

  it("paredes no mesmo alinhamento, cortadas por um vértice, viram um trecho só", () => {
    // O hall tem um vértice no meio da parede comum (x = 10).
    const rooms: DoorRoom[] = [
      {
        id: "hall",
        type: "outro",
        height: 2.7,
        points: [
          [9, 4],
          [11, 4],
          [11, 5],
          [10, 5],
          [9, 5],
        ],
      },
      rect("q", "quarto", 9.6, 5, 0.9, 3),
    ];
    const runs = sharedRuns(rooms);
    expect(runs).toHaveLength(1);
    expect(runs[0].length).toBeCloseTo(0.9);
    expect(planDoors(rooms)).toHaveLength(1);
  });

  it("portas salvas na planta (planta.portas) valem no lugar das automáticas", () => {
    const rooms = [
      rect("sala", "sala", 0, 0, 4, 3),
      rect("q", "quarto", 4, 0, 3, 3),
    ];
    const saved = [{ de: [4, 0.2] as Point, ate: [4, 1] as Point }];
    expect(planDoors(rooms, saved)).toEqual([{ a: [4, 0.2], b: [4, 1] }]);
  });

  describe.each(seed.tipologias.map((t) => [t.nome, t] as const))(
    "Residencial Demo, %s",
    (_name, typology) => {
      const rooms: DoorRoom[] = typology.comodos.map((c, i) => ({
        id: `${i}-${c.nome}`,
        type: c.tipo as RoomType,
        points: c.geometria.pontos as Point[],
        height: c.geometria.pe_direito,
      }));
      const doors = planDoors(rooms);
      const hall = rooms.find((r) => r.type === "outro")!;

      it("da circulação dá para chegar a todos os cômodos", () => {
        expect(roomsReachable(rooms, doors, hall.id).size).toBe(rooms.length);
      });

      it("nenhuma porta em parede externa e cada banheiro com uma porta", () => {
        const runs = sharedRuns(rooms);
        for (const door of doors) {
          const mid: Point = [
            (door.a[0] + door.b[0]) / 2,
            (door.a[1] + door.b[1]) / 2,
          ];
          expect(runs.some((run) => onSegment(run.a, run.b, mid))).toBe(true);
        }
        for (const bathroom of rooms.filter((r) => r.type === "banheiro")) {
          const own = doors.filter((door) => {
            const mid: Point = [
              (door.a[0] + door.b[0]) / 2,
              (door.a[1] + door.b[1]) / 2,
            ];
            return runs.some(
              (run) =>
                run.rooms.includes(bathroom) && onSegment(run.a, run.b, mid),
            );
          });
          expect(own).toHaveLength(1);
        }
      });

      it("as portas salvas no seed (e a porta de vidro da varanda) ligam todos os cômodos", () => {
        // A "janela" que começa no chão (peitoril 0) é a porta de vidro da varanda.
        const glassDoors = typology.planta.janelas
          .filter((j) => j.peitoril === 0)
          .map((j) => ({ a: j.de as Point, b: j.ate as Point }));
        const saved = planDoors(
          rooms,
          typology.planta.portas as { de: Point; ate: Point }[],
          glassDoors,
        );
        // Nenhuma porta a mais: as salvas e a de vidro já ligam tudo.
        expect(saved).toHaveLength(typology.planta.portas.length);
        expect(
          roomsReachable(rooms, [...saved, ...glassDoors], hall.id).size,
        ).toBe(rooms.length);
      });
    },
  );
});

describe("vãos nas paredes", () => {
  it("vãos sobrepostos viram um só, sem verga dentro do vão", () => {
    const walls = buildWalls([
      rect("varanda", "varanda", 0, 0, 5, 1.5),
      rect("sala", "sala", 0, 1.5, 5, 3),
    ]).filter((w) => w.rooms.length === 2);
    const pieces = wallPieces(walls, [
      { a: [0.5, 1.5], b: [4.5, 1.5], bottom: 0, top: 2.2 },
      { a: [2.1, 1.5], b: [2.9, 1.5], bottom: 0, top: 2.1 },
      { a: [2.1, 1.5], b: [2.9, 1.5], bottom: 0, top: 2.1 }, // repetida
    ]);
    expect(pieces.map((p) => [wallLength(p), p.bottom, p.top])).toEqual([
      [0.5, 0, 2.7],
      [4, 2.2, 2.7],
      [0.5, 0, 2.7],
    ]);
  });

  it("janela encostada no canto fecha a quina (verga e peitoril crescem)", () => {
    const walls = buildWalls([rect("q", "quarto", 0, 0, 3, 3)]);
    const bottom = walls.filter((w) => w.a[1] === 0 && w.b[1] === 0);
    const pieces = wallPieces(bottom, [
      { a: [0, 0], b: [1, 0], bottom: 1, top: 2.2 },
    ]);
    const sill = pieces.find((p) => p.bottom === 0 && p.top === 1)!;
    expect(sill.extendA).toBe(true);
  });

  it("porta vira dois trechos cheios e uma verga em cima", () => {
    const walls = buildWalls([
      rect("sala", "sala", 0, 0, 4, 3),
      rect("q", "quarto", 4, 0, 3, 3),
    ]).filter((w) => w.rooms.length === 2);
    const pieces = wallPieces(walls, [
      { a: [4, 1], b: [4, 1.8], bottom: 0, top: 2.1 },
    ]);
    expect(pieces.map((p) => [wallLength(p), p.bottom, p.top])).toEqual([
      [1, 0, 2.7],
      [0.8, 2.1, 2.7],
      [1.2, 0, 2.7],
    ]);
    // Só as pontas de canto crescem; as do vão não.
    expect(pieces.map((p) => [p.extendA, p.extendB])).toEqual([
      [true, false],
      [false, false],
      [false, true],
    ]);
  });
});
