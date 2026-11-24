import { describe, expect, it } from "vitest";

import { blockingSegments, collides, startPoint } from "./collision";
import { unitOpenings } from "./doors";
import { planFurniture, roomFurniture } from "./furniture";
import { rectToPolygon } from "./geometry";

const room = (
  id: string,
  type: "sala" | "quarto" | "banheiro" | "cozinha" | "outro",
  x: number,
  y: number,
  width: number,
  depth: number,
) => ({
  id,
  type,
  points: rectToPolygon({ x, y, width, depth }),
  height: 2.7,
});

const inside = (
  f: { x: number; y: number; width: number; depth: number },
  r: { x: number; y: number; width: number; depth: number },
) =>
  f.x >= r.x &&
  f.y >= r.y &&
  f.x + f.width <= r.x + r.width + 1e-9 &&
  f.y + f.depth <= r.y + r.depth + 1e-9;

const overlap = (
  a: { x: number; y: number; width: number; depth: number },
  b: { x: number; y: number; width: number; depth: number },
) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.depth &&
  b.y < a.y + a.depth;

describe("móveis simples por cômodo (#107)", () => {
  // Sala 0..5 × 0..4, quarto 5..8,5 × 0..3,5 e banheiro 5..7 × 3,5..5,5.
  const rooms = [
    room("sala", "sala", 0, 0, 5, 4),
    room("quarto", "quarto", 5, 0, 3.5, 3.5),
    room("banho", "banheiro", 5, 3.5, 2, 2),
  ];
  const pieces = planFurniture(rooms);
  const of = (id: string) => pieces.filter((p) => p.roomId === id);

  it("cada cômodo ganha móveis coerentes com o tamanho", () => {
    expect(of("quarto").map((p) => p.kind)).toEqual([
      "cama-casal",
      "guarda-roupa",
    ]);
    expect(of("sala").map((p) => p.kind)).toContain("sofa");
    expect(of("banho").map((p) => p.kind)).toContain("vaso");
    // Quarto estreito: cama de solteiro.
    const narrow = roomFurniture(room("q", "quarto", 0, 0, 2.2, 3), []);
    expect(narrow[0]?.kind).toBe("cama-solteiro");
    // Cômodo "outro" e cômodo minúsculo: nada.
    expect(roomFurniture(room("o", "outro", 0, 0, 4, 4), [])).toEqual([]);
    expect(roomFurniture(room("t", "quarto", 0, 0, 1, 1), [])).toEqual([]);
  });

  it("nenhum móvel atravessa parede, encosta em outro ou bloqueia porta", () => {
    const openings = unitOpenings(rooms);
    for (const piece of pieces) {
      const r = rooms.find((x) => x.id === piece.roomId)!;
      const rect = {
        x: r.points[0][0],
        y: r.points[0][1],
        width: r.points[2][0] - r.points[0][0],
        depth: r.points[2][1] - r.points[0][1],
      };
      expect(inside(piece.footprint, rect)).toBe(true);
      for (const door of openings.filter((o) => o.bottom === 0)) {
        const mid: [number, number] = [
          (door.a[0] + door.b[0]) / 2,
          (door.a[1] + door.b[1]) / 2,
        ];
        // Nada a menos de 0,5 m do meio de uma porta.
        const f = piece.footprint;
        const dx = Math.max(f.x - mid[0], 0, mid[0] - (f.x + f.width));
        const dy = Math.max(f.y - mid[1], 0, mid[1] - (f.y + f.depth));
        expect(Math.hypot(dx, dy)).toBeGreaterThan(0.5);
      }
    }
    for (let i = 0; i < pieces.length; i++)
      for (let j = i + 1; j < pieces.length; j++)
        expect(overlap(pieces[i].footprint, pieces[j].footprint)).toBe(false);
  });

  it("em cômodo em L, o móvel só encosta em parede de verdade", () => {
    // Sala em L: 0..6 × 0..3 mais 0..3 × 3..6 (o recorte fica em x > 3, y > 3).
    const l = {
      id: "l",
      type: "sala" as const,
      points: [
        [0, 0],
        [6, 0],
        [6, 3],
        [3, 3],
        [3, 6],
        [0, 6],
      ] as [number, number][],
      height: 2.7,
    };
    for (const piece of roomFurniture(l, [])) {
      const f = piece.footprint;
      // Nenhum móvel no recorte do L.
      expect(f.x >= 3 - 1e-9 && f.y >= 3 - 1e-9).toBe(false);
    }
  });

  it("sempre sobra passagem: nada fica na frente de outro móvel", () => {
    // Sala estreita (2 m): sofá numa parede longa; o rack não pode ir na
    // parede da frente (sobrariam 58 cm).
    const narrow = roomFurniture(room("s", "sala", 0, 0, 5, 2), []);
    const sofa = narrow.find((p) => p.kind === "sofa")!;
    const rack = narrow.find((p) => p.kind === "rack");
    expect(sofa).toBeDefined();
    if (rack) {
      const gapX = Math.max(
        rack.footprint.x - (sofa.footprint.x + sofa.footprint.width),
        sofa.footprint.x - (rack.footprint.x + rack.footprint.width),
      );
      const gapY = Math.max(
        rack.footprint.y - (sofa.footprint.y + sofa.footprint.depth),
        sofa.footprint.y - (rack.footprint.y + rack.footprint.depth),
      );
      expect(Math.max(gapX, gapY)).toBeGreaterThanOrEqual(0.7 - 1e-9);
    }
    // Suíte pequena: cama de solteiro, não de casal.
    const small = roomFurniture(
      { ...room("x", "quarto", 0, 0, 2.2, 3), type: "suite" },
      [],
    );
    expect(small[0]?.kind).toBe("cama-solteiro");
    // Parede inclinada: sem móveis.
    expect(
      roomFurniture(
        {
          id: "t",
          type: "sala",
          points: [
            [0, 0],
            [5, 0],
            [4, 4],
            [0, 4],
          ],
          height: 2.7,
        },
        [],
      ),
    ).toEqual([]);
  });

  it("o caminhar nunca começa dentro de um móvel", () => {
    // Quarto sozinho, sem porta de entrada: o início seria o meio do cômodo.
    const studio = [room("q", "quarto", 0, 0, 3, 3.5)];
    const { at } = startPoint(studio);
    for (const piece of planFurniture(studio)) {
      const f = piece.footprint;
      const inside =
        at[0] > f.x &&
        at[0] < f.x + f.width &&
        at[1] > f.y &&
        at[1] < f.y + f.depth;
      expect(inside).toBe(false);
    }
  });

  it("móvel alto não fica embaixo da janela", () => {
    const quarto = room("q", "quarto", 0, 0, 3.5, 3.5);
    // Janela larga na parede de baixo (y = 0), a 1 m do chão.
    const window = {
      a: [0.3, 0] as [number, number],
      b: [3.2, 0] as [number, number],
      bottom: 1,
      top: 2.2,
    };
    const placed = roomFurniture(quarto, [window]);
    const wardrobe = placed.find((p) => p.kind === "guarda-roupa");
    // Ele existe (cabe em outra parede) e não está na parede da janela.
    expect(wardrobe).toBeDefined();
    expect(wardrobe!.footprint.y).toBeGreaterThan(0.2);
  });

  it("os móveis bloqueiam o caminhar e o início fica livre; desligados, somem", () => {
    const walls = blockingSegments(rooms);
    const bed = of("quarto").find((p) => p.kind === "cama-casal")!;
    const center: [number, number] = [
      bed.footprint.x + bed.footprint.width / 2,
      bed.footprint.y + bed.footprint.depth / 2,
    ];
    // Encostado na borda da cama: bloqueado.
    expect(collides([bed.footprint.x - 0.05, center[1]], walls)).toBe(true);
    const { at } = startPoint(rooms);
    expect(collides(at, walls)).toBe(false);
    expect(
      planFurniture(rooms, { portas: [], janelas: [], moveis: false }),
    ).toEqual([]);
  });
});
