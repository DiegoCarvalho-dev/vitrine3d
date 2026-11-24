import type { RoomType } from "@/lib/validacoes/comodo";
import type { FloorPlan, Point } from "@/lib/validacoes/planta";

import { DOOR_HEIGHT, type DoorRoom, onSegment, planDoors } from "./doors";
import { buildWalls, type WallSegment } from "./walls";

// Doors and windows in the visual editor (issue #106). They live on the
// walls built from the rooms (walls.ts) and are saved in tipologias.planta
// (portas / janelas, docs/03). Meters, origin at the bottom-left, Y up.

/** porta = door; janela = window; vidro = glass door (a window from the floor). */
export type OpeningKind = "porta" | "janela" | "vidro";

export type DraftOpening = {
  key: string;
  kind: OpeningKind;
  a: Point;
  b: Point;
  /** Height of the bottom edge (peitoril), meters: 0 for doors. */
  sill: number;
  /** Height of the opening itself, meters. */
  height: number;
};

export const OPENING_DEFAULTS: Record<
  OpeningKind,
  { width: number; sill: number; height: number; label: string }
> = {
  porta: { width: 0.8, sill: 0, height: DOOR_HEIGHT, label: "Porta" },
  janela: { width: 1.2, sill: 1, height: 1.2, label: "Janela" },
  vidro: { width: 1.6, sill: 0, height: DOOR_HEIGHT, label: "Porta de vidro" },
};

/** Widths offered in the editor (meters). */
export const OPENING_WIDTHS = [
  0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.4, 3,
] as const;

const EPS = 1e-3;
const STEP = 0.05; // openings slide along the wall in 5 cm steps
const MARGIN = 0.05; // never touching the wall's ends
const round3 = (n: number) => Math.round(n * 1000) / 1000;

type Room = {
  id: string;
  type: RoomType;
  points: readonly Point[];
  height: number;
};

export const wallsOf = (rooms: readonly Room[]) => buildWalls(rooms);

const lengthOf = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Distance from p to the segment a→b and where it falls (0..1). */
function project(a: Point, b: Point, p: Point) {
  const len2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
  const t =
    len2 === 0
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) /
              len2,
          ),
        );
  const q: Point = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  return { t, distance: lengthOf(q, p) };
}

/** The wall closest to p, if it's within `maxDistance` meters. */
export function nearestWall(
  walls: readonly WallSegment[],
  p: Point,
  maxDistance: number,
): WallSegment | null {
  let best: WallSegment | null = null;
  let bestDistance = maxDistance;
  for (const wall of walls) {
    const { distance } = project(wall.a, wall.b, p);
    if (distance <= bestDistance) {
      best = wall;
      bestDistance = distance;
    }
  }
  return best;
}

/** The wall an opening sits on (both ends on it), or null. */
export function wallOf(
  walls: readonly WallSegment[],
  opening: { a: Point; b: Point },
): WallSegment | null {
  return (
    walls.find(
      (wall) =>
        onSegment(wall.a, wall.b, opening.a) &&
        onSegment(wall.a, wall.b, opening.b),
    ) ?? null
  );
}

/**
 * An opening of `width` centered (as close as it fits) at p on the wall,
 * in 5 cm steps. A wall too short gets a narrower opening (min 0,5 m);
 * shorter than that: null.
 */
export function placeOnWall(
  wall: WallSegment,
  p: Point,
  width: number,
): { a: Point; b: Point } | null {
  const length = lengthOf(wall.a, wall.b);
  const w = Math.min(width, round3(length - MARGIN * 2));
  if (w < 0.5 - EPS) return null;
  const { t } = project(wall.a, wall.b, p);
  const half = w / 2;
  let center = Math.round((t * length) / STEP) * STEP;
  center = Math.min(length - MARGIN - half, Math.max(MARGIN + half, center));
  const at = (d: number): Point => [
    round3(wall.a[0] + ((wall.b[0] - wall.a[0]) * d) / length),
    round3(wall.a[1] + ((wall.b[1] - wall.a[1]) * d) / length),
  ];
  return { a: at(center - half), b: at(center + half) };
}

/** Why this kind of opening can't go on this wall, or null when it can. */
export function wallRule(kind: OpeningKind, wall: WallSegment): string | null {
  if (kind === "janela" && wall.rooms.length > 1)
    return "Janela vai em parede externa. Entre dois cômodos (ex.: sala e varanda), use “Porta de vidro”.";
  return null;
}

/** Same opening, centered at p (still on its wall) — dragging it along. */
export function slideOpening(
  walls: readonly WallSegment[],
  opening: DraftOpening,
  p: Point,
): DraftOpening {
  const wall = wallOf(walls, opening);
  if (!wall) return opening;
  const placed = placeOnWall(wall, p, lengthOf(opening.a, opening.b));
  return placed ? { ...opening, ...placed } : opening;
}

/** Opening width, meters. */
export const widthOf = (o: { a: Point; b: Point }) =>
  round3(lengthOf(o.a, o.b));

/** Is the opening on one of the edges of this room (polygon)? */
function onRoomEdge(points: readonly Point[], o: { a: Point; b: Point }) {
  return points.some((p, i) => {
    const q = points[(i + 1) % points.length];
    return onSegment(p, q, o.a) && onSegment(p, q, o.b);
  });
}

/**
 * When a room moves, the openings on its walls go with it (a door on the
 * kitchen's wall stays on the kitchen's wall).
 */
export function carryOpenings(
  openings: readonly DraftOpening[],
  before: readonly Point[],
  dx: number,
  dy: number,
): DraftOpening[] {
  if (!dx && !dy) return [...openings];
  return openings.map((o) =>
    onRoomEdge(before, o)
      ? {
          ...o,
          a: [round3(o.a[0] + dx), round3(o.a[1] + dy)],
          b: [round3(o.b[0] + dx), round3(o.b[1] + dy)],
        }
      : o,
  );
}

let openingCounter = 0;
export const newOpeningKey = () => `abertura-${++openingCounter}`;

/**
 * The saved plan → editor openings. Without saved doors, the automatic ones
 * (the same the tour shows today) become editable doors.
 */
export function openingsFromPlan(
  rooms: readonly DoorRoom[],
  plan?: Pick<FloorPlan, "portas" | "janelas">,
): DraftOpening[] {
  const windows: DraftOpening[] = (plan?.janelas ?? []).map((w) => ({
    key: newOpeningKey(),
    kind: w.peitoril === 0 ? "vidro" : "janela",
    a: w.de,
    b: w.ate,
    sill: w.peitoril,
    height: w.altura,
  }));
  const glass = windows
    .filter((w) => w.kind === "vidro")
    .map((w) => ({ a: w.a, b: w.b }));
  const doors = plan?.portas.length
    ? plan.portas.map((d) => ({ a: d.de, b: d.ate }))
    : planDoors(rooms, [], glass);
  return [
    ...doors.map((d): DraftOpening => ({
      key: newOpeningKey(),
      kind: "porta",
      a: d.a,
      b: d.b,
      sill: 0,
      height: DOOR_HEIGHT,
    })),
    ...windows,
  ];
}

/** Editor openings → tipologias.planta (the ones off the walls are left out). */
export function planFromOpenings(
  rooms: readonly Room[],
  openings: readonly DraftOpening[],
): { plan: FloorPlan; dropped: number } {
  const walls = buildWalls(rooms);
  const kept = openings.filter((o) => {
    const wall = wallOf(walls, o);
    return wall && !wallRule(o.kind, wall);
  });
  return {
    plan: {
      versao: 1,
      portas: kept
        .filter((o) => o.kind === "porta")
        .map((o) => ({ de: o.a, ate: o.b })),
      janelas: kept
        .filter((o) => o.kind !== "porta")
        .map((o) => ({
          de: o.a,
          ate: o.b,
          peitoril: o.kind === "vidro" ? 0 : o.sill,
          altura: o.height,
        })),
    },
    dropped: openings.length - kept.length,
  };
}

/**
 * Server check of a plan against the rooms it goes with: every door and
 * window on a wall, windows (not glass doors) only on exterior walls.
 */
export function planProblem(
  rooms: readonly Room[],
  plan: Pick<FloorPlan, "portas" | "janelas">,
): string | null {
  const walls = buildWalls(rooms);
  for (const door of plan.portas)
    if (!wallOf(walls, { a: door.de, b: door.ate }))
      return "Há uma porta fora das paredes. Confira a planta.";
  for (const w of plan.janelas) {
    const wall = wallOf(walls, { a: w.de, b: w.ate });
    if (!wall) return "Há uma janela fora das paredes. Confira a planta.";
    const rule = wallRule(w.peitoril === 0 ? "vidro" : "janela", wall);
    if (rule) return rule;
  }
  return null;
}
