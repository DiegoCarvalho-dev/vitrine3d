import type { FloorPlan, Point } from "@/lib/validacoes/planta";

import { type DoorRoom, unitOpenings } from "./doors";
import { isInside, labelPoint } from "./geometry";
import { buildWalls, WALL_THICKNESS, wallPieces } from "./walls";

// Walking inside the unit (issue #51): the visitor is a circle on the plan
// that can't cross the walls, only the doors (and floor-level glass doors).

export const EYE_HEIGHT = 1.6;
export const BODY_RADIUS = 0.25;
const BODY_HEIGHT = 1.8; // a wall piece starting above this doesn't block

export type Segment = { a: Point; b: Point };

/** The wall parts that block a person (lintels above doors don't). */
export function blockingSegments(
  rooms: readonly DoorRoom[],
  plan?: Pick<FloorPlan, "portas" | "janelas">,
): Segment[] {
  return wallPieces(buildWalls(rooms), unitOpenings(rooms, plan))
    .filter((piece) => piece.bottom < BODY_HEIGHT)
    .map(({ a, b }) => ({ a, b }));
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

const CLEARANCE = BODY_RADIUS + WALL_THICKNESS / 2;

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
  return candidates.find((p) => !collides(p, walls)) ?? from;
}

/**
 * Where the walk starts: just inside the front door (a door on an exterior
 * wall), facing in. Without one, in the middle of the living room (or the
 * first room). `facing` is the direction on the plan.
 */
export function startPoint(
  rooms: readonly DoorRoom[],
  plan?: Pick<FloorPlan, "portas" | "janelas">,
): { at: Point; facing: Point } {
  const exterior = buildWalls(rooms).filter((wall) => wall.rooms.length === 1);
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
      const at: Point = [mid[0] + normal[0] * 0.8, mid[1] + normal[1] * 0.8];
      if (isInside(room.points, at)) return { at, facing: normal };
    }
  }
  const living =
    rooms.find((r) => r.type === "sala") ??
    rooms.find((r) => r.type === "outro") ??
    rooms[0];
  const at = labelPoint(living.points);
  return { at, facing: widestView(at, blockingSegments(rooms, plan)) };
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
