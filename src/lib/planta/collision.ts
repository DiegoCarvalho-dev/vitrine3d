import type { FloorPlan, Point } from "@/lib/validacoes/planta";

import { type DoorRoom, unitOpenings } from "./doors";
import { planFurniture } from "./furniture";
import { isInside, labelPoint } from "./geometry";
import { buildWalls, type Opening, WALL_THICKNESS, wallPieces } from "./walls";

// Walking inside the unit (issue #51): the visitor is a circle on the plan
// that can't cross the walls, only the doors (and floor-level glass doors).

export const EYE_HEIGHT = 1.6;
export const BODY_RADIUS = 0.25;
const BODY_HEIGHT = 1.8; // a wall piece starting above this doesn't block

export type Segment = { a: Point; b: Point };

const CLEARANCE = BODY_RADIUS + WALL_THICKNESS / 2;
/** A passage narrower than this is widened for walking (0.6 m doors). */
const MIN_PASSAGE = 2 * CLEARANCE + 0.16;

/** Widens a floor-level opening around its middle (walking only). */
function widen(opening: Opening): Opening {
  const dx = opening.b[0] - opening.a[0];
  const dy = opening.b[1] - opening.a[1];
  const length = Math.hypot(dx, dy);
  if (!length || length >= MIN_PASSAGE || opening.bottom > 0) return opening;
  const grow = (MIN_PASSAGE - length) / 2 / length;
  return {
    ...opening,
    a: [opening.a[0] - dx * grow, opening.a[1] - dy * grow],
    b: [opening.b[0] + dx * grow, opening.b[1] + dy * grow],
  };
}

/**
 * The wall parts that block a person: the walls between rooms minus their
 * doors (lintels above don't block), and ALL exterior walls, even where the
 * front door is (the walk stays inside the unit).
 */
export function blockingSegments(
  rooms: readonly DoorRoom[],
  plan?: Pick<FloorPlan, "portas" | "janelas" | "portas_definidas" | "moveis">,
): Segment[] {
  const walls = buildWalls(rooms);
  const inside = walls.filter((wall) => wall.rooms.length === 2);
  const outside = walls.filter((wall) => wall.rooms.length === 1);
  const openings = unitOpenings(rooms, plan).map(widen);
  // Furniture (#107) blocks too: its outline on the floor.
  const furniture = planFurniture(rooms, plan)
    .filter((piece) => piece.blocks)
    .flatMap(({ footprint: f }): Segment[] => {
      const corners: Point[] = [
        [f.x, f.y],
        [f.x + f.width, f.y],
        [f.x + f.width, f.y + f.depth],
        [f.x, f.y + f.depth],
      ];
      return corners.map((a, i) => ({ a, b: corners[(i + 1) % 4] }));
    });
  return [
    ...wallPieces(inside, openings)
      .filter((piece) => piece.bottom < BODY_HEIGHT)
      .map(({ a, b }) => ({ a, b })),
    ...outside.map(({ a, b }) => ({ a, b })),
    ...furniture,
  ];
}

function distanceToSegment(p: Point, { a, b }: Segment): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length2 = dx * dx + dy * dy;
  const t = length2
    ? Math.max(
        0,
        Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length2),
      )
    : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

export function collides(p: Point, walls: readonly Segment[]): boolean {
  return walls.some((wall) => distanceToSegment(p, wall) < CLEARANCE);
}

/**
 * One step from `from` by `delta` (meters). Blocked by a wall, it slides
 * along it (tries each axis alone), so the visitor doesn't "stick".
 */
export function step(
  from: Point,
  delta: Point,
  walls: readonly Segment[],
): Point {
  const candidates: Point[] = [
    [from[0] + delta[0], from[1] + delta[1]],
    [from[0] + delta[0], from[1]],
    [from[0], from[1] + delta[1]],
  ];
  const free = candidates.find((p) => !collides(p, walls));
  if (free) return free;
  // Already touching a wall (e.g. a tight start): any move away is allowed.
  const target = candidates[0];
  return nearestWall(target, walls) > nearestWall(from, walls) ? target : from;
}

function nearestWall(p: Point, walls: readonly Segment[]): number {
  return Math.min(...walls.map((wall) => distanceToSegment(p, wall)));
}

type Box = { x: number; y: number; width: number; depth: number };

/** Inside a piece of furniture (with the body's clearance around it)? */
const insideAny = (p: Point, boxes: readonly Box[]) =>
  boxes.some(
    (b) =>
      p[0] > b.x - CLEARANCE &&
      p[0] < b.x + b.width + CLEARANCE &&
      p[1] > b.y - CLEARANCE &&
      p[1] < b.y + b.depth + CLEARANCE,
  );

/**
 * The closest free spot to `p` (rings of 10 cm around it), or `p`. Free =
 * away from the walls AND not inside furniture (its outline alone would
 * let a point deep inside a bed count as free).
 */
function freeSpotNear(
  p: Point,
  walls: readonly Segment[],
  boxes: readonly Box[] = [],
): Point {
  const blocked = (q: Point) => collides(q, walls) || insideAny(q, boxes);
  if (!blocked(p)) return p;
  for (let ring = 1; ring <= 15; ring++) {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const q: Point = [
        p[0] + Math.cos(angle) * ring * 0.1,
        p[1] + Math.sin(angle) * ring * 0.1,
      ];
      if (!blocked(q)) return q;
    }
  }
  return p;
}

/**
 * Where the walk starts: just inside the front door (a door on an exterior
 * wall), facing in. Without one, in the middle of the living room (or the
 * first room). `facing` is the direction on the plan.
 */
export function startPoint(
  rooms: readonly DoorRoom[],
  plan?: Pick<FloorPlan, "portas" | "janelas" | "portas_definidas" | "moveis">,
): { at: Point; facing: Point } {
  const exterior = buildWalls(rooms).filter((wall) => wall.rooms.length === 1);
  const walls = blockingSegments(rooms, plan);
  const boxes = planFurniture(rooms, plan)
    .filter((piece) => piece.blocks)
    .map((piece) => piece.footprint);
  const doors = (plan?.portas ?? []).map((d) => ({ a: d.de, b: d.ate }));
  for (const door of doors) {
    const mid: Point = [
      (door.a[0] + door.b[0]) / 2,
      (door.a[1] + door.b[1]) / 2,
    ];
    const wall = exterior.find((w) => distanceToSegment(mid, w) < 1e-3);
    if (!wall) continue;
    const room = rooms.find((r) => r.id === wall.rooms[0]);
    if (!room) continue;
    // The wall's normal pointing into the room.
    const dx = wall.b[0] - wall.a[0];
    const dy = wall.b[1] - wall.a[1];
    const length = Math.hypot(dx, dy);
    for (const sign of [1, -1]) {
      const normal: Point = [(-dy / length) * sign, (dx / length) * sign];
      const inward: Point = [
        mid[0] + normal[0] * 0.8,
        mid[1] + normal[1] * 0.8,
      ];
      if (isInside(room.points, inward))
        return { at: freeSpotNear(inward, walls, boxes), facing: normal };
    }
  }
  const living =
    rooms.find((r) => r.type === "sala") ??
    rooms.find((r) => r.type === "outro") ??
    rooms[0];
  const at = freeSpotNear(labelPoint(living.points), walls, boxes);
  return { at, facing: widestView(at, walls) };
}

/** How far a ray from `from` along `dir` goes before hitting a wall. */
export function rayDistance(
  from: Point,
  dir: Point,
  walls: readonly Segment[],
): number {
  let nearest = Infinity;
  for (const { a, b } of walls) {
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const denom = dir[0] * ey - dir[1] * ex;
    if (Math.abs(denom) < 1e-9) continue; // parallel
    const ax = a[0] - from[0];
    const ay = a[1] - from[1];
    const t = (ax * ey - ay * ex) / denom; // along the ray
    const u = (ax * dir[1] - ay * dir[0]) / denom; // along the wall
    if (t > 0 && u >= 0 && u <= 1) nearest = Math.min(nearest, t);
  }
  return nearest;
}

/** The direction (of 16) with the most open space ahead: never a wall. */
export function widestView(at: Point, walls: readonly Segment[]): Point {
  let best: Point = [0, 1];
  let longest = -1;
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const dir: Point = [Math.sin(angle), Math.cos(angle)];
    // Open space straight ahead, plus the average over a 60-degree cone:
    // a real view, not a far corner seen through a gap.
    let distance = Math.min(rayDistance(at, dir, walls), 50);
    for (const spread of [-0.52, -0.26, 0.26, 0.52]) {
      const turned = angle + spread;
      distance +=
        Math.min(
          rayDistance(at, [Math.sin(turned), Math.cos(turned)], walls),
          50,
        ) / 4;
    }
    if (distance > longest + 1e-6) {
      longest = distance;
      best = dir;
    }
  }
  return best;
}
