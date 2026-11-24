import type { RoomType } from "@/lib/validacoes/comodo";
import type { FloorPlan, Point } from "@/lib/validacoes/planta";

import { onSegment, unitOpenings } from "./doors";
import { rectsOf } from "./editor";
import type { Rect } from "./geometry";
import { type Opening, WALL_THICKNESS } from "./walls";

// Simple furniture by room type (issue #107): blocks with soft colors that
// give scale (does a double bed fit?), placed automatically against the
// walls, away from doors, and tall pieces never under a window. Nothing
// heavy: the 3D draws every piece of the unit in ONE instanced mesh.

export type FurnitureKind =
  | "cama-casal"
  | "cama-solteiro"
  | "guarda-roupa"
  | "sofa"
  | "rack"
  | "mesa"
  | "bancada"
  | "geladeira"
  | "pia"
  | "vaso"
  | "box"
  | "tanque"
  | "maquina"
  | "mesinha";

/**
 * One box of a piece, in the piece's own frame: u along the wall (−w/2..w/2),
 * v away from the wall (0..d), z up (meters).
 */
type Part = {
  u: [number, number];
  v: [number, number];
  z: [number, number];
  color: string;
};

type Spec = {
  /** Along the wall. */
  width: number;
  /** Out from the wall. */
  depth: number;
  height: number;
  /** Blocks walking (a shower tray on the floor doesn't). */
  blocks: boolean;
  parts: (w: number, d: number) => Part[];
};

const WOOD = "#7a5a3c";
const LIGHT_WOOD = "#c8ad8a";
const FABRIC = "#8a9aa6";
const SHEET = "#cfdbe6"; // light blue: reads as a bed against white walls
const WHITE = "#f2f2f0";
const STEEL = "#c9cdd1";
const STONE = "#6f6a64";

const full = (w: number, d: number, top: number, color: string): Part => ({
  u: [-w / 2, w / 2],
  v: [0, d],
  z: [0, top],
  color,
});

const bed = (w: number, d: number): Part[] => [
  { u: [-w / 2, w / 2], v: [0.06, d], z: [0, 0.45], color: SHEET },
  { u: [-w / 2, w / 2], v: [0, 0.06], z: [0, 1], color: WOOD },
  {
    u: [-w / 2 + 0.1, w / 2 - 0.1],
    v: [0.12, 0.5],
    z: [0.45, 0.56],
    color: WHITE,
  },
];

export const FURNITURE: Record<FurnitureKind, Spec> = {
  "cama-casal": {
    width: 1.4,
    depth: 1.95,
    height: 1,
    blocks: true,
    parts: bed,
  },
  "cama-solteiro": {
    width: 0.9,
    depth: 1.95,
    height: 1,
    blocks: true,
    parts: bed,
  },
  "guarda-roupa": {
    width: 1.6,
    depth: 0.6,
    height: 2.1,
    blocks: true,
    parts: (w, d) => [full(w, d, 2.1, LIGHT_WOOD)],
  },
  sofa: {
    width: 2,
    depth: 0.9,
    height: 0.85,
    blocks: true,
    parts: (w, d) => [
      { u: [-w / 2, w / 2], v: [0.2, d], z: [0, 0.42], color: FABRIC },
      { u: [-w / 2, w / 2], v: [0, 0.25], z: [0, 0.85], color: FABRIC },
    ],
  },
  rack: {
    width: 1.6,
    depth: 0.4,
    height: 0.5,
    blocks: true,
    parts: (w, d) => [full(w, d, 0.5, WOOD)],
  },
  mesa: {
    width: 1.2,
    depth: 0.8,
    height: 0.75,
    blocks: true,
    parts: (w, d) => [
      { u: [-w / 2, w / 2], v: [0, d], z: [0.7, 0.75], color: LIGHT_WOOD },
      {
        u: [-0.15, 0.15],
        v: [d / 2 - 0.15, d / 2 + 0.15],
        z: [0, 0.7],
        color: WOOD,
      },
    ],
  },
  bancada: {
    width: 2.2,
    depth: 0.6,
    height: 0.92,
    blocks: true,
    parts: (w, d) => [
      full(w, d, 0.88, WHITE),
      { u: [-w / 2, w / 2], v: [0, d], z: [0.88, 0.92], color: STONE },
    ],
  },
  geladeira: {
    width: 0.7,
    depth: 0.7,
    height: 1.8,
    blocks: true,
    parts: (w, d) => [full(w, d, 1.8, STEEL)],
  },
  pia: {
    width: 0.6,
    depth: 0.45,
    height: 0.85,
    blocks: true,
    parts: (w, d) => [full(w, d, 0.85, WHITE)],
  },
  vaso: {
    width: 0.4,
    depth: 0.65,
    height: 0.75,
    blocks: true,
    parts: (w, d) => [
      { u: [-w / 2, w / 2], v: [0.15, d], z: [0, 0.4], color: WHITE },
      { u: [-w / 2, w / 2], v: [0, 0.18], z: [0, 0.75], color: WHITE },
    ],
  },
  box: {
    width: 0.9,
    depth: 0.9,
    height: 0.05,
    blocks: false,
    parts: (w, d) => [full(w, d, 0.05, STEEL)],
  },
  tanque: {
    width: 0.6,
    depth: 0.5,
    height: 0.9,
    blocks: true,
    parts: (w, d) => [full(w, d, 0.9, WHITE)],
  },
  maquina: {
    width: 0.6,
    depth: 0.6,
    height: 0.85,
    blocks: true,
    parts: (w, d) => [full(w, d, 0.85, STEEL)],
  },
  mesinha: {
    width: 0.6,
    depth: 0.6,
    height: 0.7,
    blocks: true,
    parts: (w, d) => [full(w, d, 0.7, LIGHT_WOOD)],
  },
};

type Room = {
  id: string;
  type: RoomType;
  points: readonly Point[];
  height: number;
};

/** What goes in each type of room, most important first. */
function wishList(type: RoomType, rect: Rect): FurnitureKind[] {
  const area = rect.width * rect.depth;
  const short = Math.min(rect.width, rect.depth);
  const bedFor = short >= 2.6 && area >= 8.5 ? "cama-casal" : "cama-solteiro";
  switch (type) {
    case "quarto":
      return [bedFor, ...(area >= 7 ? (["guarda-roupa"] as const) : [])];
    case "suite":
      return ["cama-casal", "cama-solteiro", "guarda-roupa"];
    case "sala":
      return ["sofa", "rack", ...(area >= 14 ? (["mesa"] as const) : [])];
    case "cozinha":
      return ["bancada", "geladeira"];
    case "banheiro":
      return ["box", "vaso", "pia"];
    case "lavanderia":
      return ["tanque", "maquina"];
    case "varanda":
      return ["mesinha"];
    default:
      return [];
  }
}

export type FurniturePiece = {
  roomId: string;
  kind: FurnitureKind;
  /** Footprint on the plan (axis-aligned), for collision and checks. */
  footprint: Rect;
  blocks: boolean;
  /** Boxes in plan coordinates: x, y (plan) and z (height). */
  boxes: {
    x: [number, number];
    y: [number, number];
    z: [number, number];
    color: string;
  }[];
};

const GAP = 0.05; // between pieces
const DOOR_CLEAR = 0.9; // free space in front of a door, on both sides
const MAX_COVER = 0.45; // furniture never takes more than 45% of the room

const intersects = (a: Rect, b: Rect, pad = 0) =>
  a.x < b.x + b.width + pad &&
  b.x < a.x + a.width + pad &&
  a.y < b.y + b.depth + pad &&
  b.y < a.y + a.depth + pad;

/** The free area in front of (and behind) a floor-level opening. */
function doorZone(o: Opening): Rect {
  const x0 = Math.min(o.a[0], o.b[0]);
  const x1 = Math.max(o.a[0], o.b[0]);
  const y0 = Math.min(o.a[1], o.b[1]);
  const y1 = Math.max(o.a[1], o.b[1]);
  return x1 - x0 < 1e-6 // vertical wall: clear to the left and right
    ? {
        x: x0 - DOOR_CLEAR,
        y: y0 - 0.1,
        width: DOOR_CLEAR * 2,
        depth: y1 - y0 + 0.2,
      }
    : {
        x: x0 - 0.1,
        y: y0 - DOOR_CLEAR,
        width: x1 - x0 + 0.2,
        depth: DOOR_CLEAR * 2,
      };
}

type Side = { a: Point; b: Point; inward: Point };

/** The four sides of the rect, each with the direction into the room. */
function sidesOf(r: Rect): Side[] {
  const x1 = r.x + r.width;
  const y1 = r.y + r.depth;
  return [
    { a: [r.x, r.y], b: [x1, r.y], inward: [0, 1] },
    { a: [x1, r.y], b: [x1, y1], inward: [-1, 0] },
    { a: [x1, y1], b: [r.x, y1], inward: [0, -1] },
    { a: [r.x, y1], b: [r.x, r.y], inward: [1, 0] },
  ];
}

/** Is p on the room's outline (one of its walls)? */
function onBoundary(points: readonly Point[], p: Point) {
  return points.some((q, i) =>
    onSegment(q, points[(i + 1) % points.length], p),
  );
}

/** A side is (at least partly) a real wall of the room. */
function isWall(points: readonly Point[], side: Side) {
  const mid: Point = [(side.a[0] + side.b[0]) / 2, (side.a[1] + side.b[1]) / 2];
  return (
    onBoundary(points, side.a) &&
    onBoundary(points, side.b) &&
    onBoundary(points, mid)
  );
}

/** Places a piece against `side`, starting at `offset` meters along it. */
function pieceAt(
  roomId: string,
  kind: FurnitureKind,
  side: Side,
  offset: number,
  width: number,
): FurniturePiece {
  const spec = FURNITURE[kind];
  const inset = WALL_THICKNESS / 2;
  const len = Math.hypot(side.b[0] - side.a[0], side.b[1] - side.a[1]);
  const ux = (side.b[0] - side.a[0]) / len;
  const uy = (side.b[1] - side.a[1]) / len;
  const [nx, ny] = side.inward;
  // Center of the piece's back, on the wall (inset by half a wall).
  const cu = offset + width / 2;
  const base: Point = [
    side.a[0] + ux * cu + nx * inset,
    side.a[1] + uy * cu + ny * inset,
  ];
  const toPlan = (u: number, v: number): Point => [
    base[0] + ux * u + nx * v,
    base[1] + uy * u + ny * v,
  ];
  const boxes = spec.parts(width, spec.depth).map((part) => {
    const p = toPlan(part.u[0], part.v[0]);
    const q = toPlan(part.u[1], part.v[1]);
    return {
      x: [Math.min(p[0], q[0]), Math.max(p[0], q[0])] as [number, number],
      y: [Math.min(p[1], q[1]), Math.max(p[1], q[1])] as [number, number],
      z: part.z,
      color: part.color,
    };
  });
  const p = toPlan(-width / 2, 0);
  const q = toPlan(width / 2, spec.depth);
  const footprint = {
    x: Math.min(p[0], q[0]),
    y: Math.min(p[1], q[1]),
    width: Math.abs(q[0] - p[0]),
    depth: Math.abs(q[1] - p[1]),
  };
  return { roomId, kind, footprint, blocks: spec.blocks, boxes };
}

/** Furniture of one room, given every opening of the unit. */
export function roomFurniture(
  room: Room,
  openings: readonly Opening[],
): FurniturePiece[] {
  const rects = rectsOf(room.points);
  if (!rects.length) return [];
  // The biggest rectangle of the room (an L uses its main part).
  const rect = rects.reduce((a, b) =>
    b.width * b.depth > a.width * a.depth ? b : a,
  );
  const inset = WALL_THICKNESS / 2;
  const inner: Rect = {
    x: rect.x + inset - 1e-6,
    y: rect.y + inset - 1e-6,
    width: rect.width - inset * 2 + 2e-6,
    depth: rect.depth - inset * 2 + 2e-6,
  };
  const zones = openings.filter((o) => o.bottom === 0).map(doorZone);
  const windows = openings.filter((o) => o.bottom > 0);
  const sides = sidesOf(rect)
    .filter((side) => isWall(room.points, side))
    .sort(
      (s, t) =>
        Math.hypot(t.b[0] - t.a[0], t.b[1] - t.a[1]) -
        Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]),
    );
  const placed: FurniturePiece[] = [];
  let covered = 0;
  const wanted = wishList(room.type, rect);
  const done = new Set<string>(); // one bed per room (casal OR solteiro)

  for (const kind of wanted) {
    const family = kind.startsWith("cama") ? "cama" : kind;
    if (done.has(family)) continue;
    const spec = FURNITURE[kind];
    for (const side of sides) {
      const len = Math.hypot(side.b[0] - side.a[0], side.b[1] - side.a[1]);
      // The counter takes what the wall offers (up to 2,4 m).
      const width =
        kind === "bancada" ? Math.min(2.4, len - 2 * inset - 0.3) : spec.width;
      if (width < Math.min(spec.width, 1) || width > len - 2 * inset) continue;
      const free = len - 2 * inset - width;
      const offsets = [inset, inset + free / 2, inset + free];
      const along = (d: number): Point => [
        side.a[0] + ((side.b[0] - side.a[0]) * d) / len,
        side.a[1] + ((side.b[1] - side.a[1]) * d) / len,
      ];
      const fit = offsets
        // Its back must lean on a real wall along its whole width.
        .filter((offset) =>
          [offset, offset + width / 2, offset + width].every((d) =>
            onBoundary(room.points, along(d)),
          ),
        )
        .map((offset) => pieceAt(room.id, kind, side, offset, width))
        .find((piece) => {
          const f = piece.footprint;
          const insideRoom =
            f.x >= inner.x &&
            f.y >= inner.y &&
            f.x + f.width <= inner.x + inner.width &&
            f.y + f.depth <= inner.y + inner.depth;
          if (!insideRoom) return false;
          if (zones.some((z) => intersects(f, z))) return false;
          if (placed.some((other) => intersects(f, other.footprint, GAP)))
            return false;
          // A tall piece never covers a window on its wall.
          const underWindow = windows.some(
            (w) =>
              spec.height > w.bottom &&
              intersects(f, {
                x: Math.min(w.a[0], w.b[0]) - 0.15,
                y: Math.min(w.a[1], w.b[1]) - 0.15,
                width: Math.abs(w.b[0] - w.a[0]) + 0.3,
                depth: Math.abs(w.b[1] - w.a[1]) + 0.3,
              }),
          );
          if (underWindow) return false;
          const area = rect.width * rect.depth;
          return covered + f.width * f.depth <= area * MAX_COVER;
        });
      if (fit) {
        placed.push(fit);
        covered += fit.footprint.width * fit.footprint.depth;
        done.add(family);
        break;
      }
    }
  }
  return placed;
}

/** All the furniture of the unit (none when the plan turns it off). */
export function planFurniture(
  rooms: readonly Room[],
  plan?: Pick<FloorPlan, "portas" | "janelas" | "portas_definidas" | "moveis">,
): FurniturePiece[] {
  if (plan?.moveis === false) return [];
  const openings = unitOpenings(rooms, plan);
  return rooms.flatMap((room) => roomFurniture(room, openings));
}
