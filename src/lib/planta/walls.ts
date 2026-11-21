import type { Point } from "@/lib/validacoes/planta";

// Walls of the unit in 3D (issue #48), from the room polygons (meters, origin
// at the bottom-left corner, docs/03). Each polygon edge becomes a wall; where
// two rooms touch, the shared stretch becomes ONE wall (never two).

export type PlanRoom = {
  id: string;
  points: readonly Point[];
  /** Ceiling height (pé-direito), meters. */
  height: number;
};

export type WallSegment = {
  a: Point;
  b: Point;
  /** Tallest of the rooms on its sides. */
  height: number;
  /** Rooms on its sides: one = exterior wall, two = shared (interior). */
  rooms: string[];
};

export const WALL_THICKNESS = 0.12;
const EPS = 1e-3;

const round = (n: number) => Math.round(n * 1000) / 1000;
const keyOf = (p: Point) => `${round(p[0])},${round(p[1])}`;

type Edge = { a: Point; b: Point; room: PlanRoom };

/** Position of p along a→b (0 at a, 1 at b), or null if p is off the line. */
function along(a: Point, b: Point, p: Point): number | null {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy);
  if (length < EPS) return null;
  // Distance from p to the infinite line a→b.
  const cross = (p[0] - a[0]) * dy - (p[1] - a[1]) * dx;
  if (Math.abs(cross) / length > EPS) return null;
  return ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (length * length);
}

export function edgesOf(room: PlanRoom): Edge[] {
  return room.points.map((a, i) => ({
    a,
    b: room.points[(i + 1) % room.points.length],
    room,
  }));
}

/**
 * All walls of the unit. Every edge is cut at the ends of the edges lying on
 * the same line, so the overlapping stretches of two rooms come out with the
 * same endpoints and merge into a single shared wall.
 */
export function buildWalls(rooms: readonly PlanRoom[]): WallSegment[] {
  const edges = rooms.flatMap(edgesOf);
  const walls = new Map<string, WallSegment>();

  for (const edge of edges) {
    const cuts = new Set([0, 1]);
    for (const other of edges) {
      if (other.room === edge.room) continue;
      const ta = along(edge.a, edge.b, other.a);
      const tb = along(edge.a, edge.b, other.b);
      if (ta === null || tb === null) continue; // not on the same line
      for (const t of [ta, tb]) if (t > EPS && t < 1 - EPS) cuts.add(t);
    }
    const sorted = [...cuts].sort((x, y) => x - y);
    for (let i = 0; i < sorted.length - 1; i++) {
      const at = (t: number): Point => [
        round(edge.a[0] + (edge.b[0] - edge.a[0]) * t),
        round(edge.a[1] + (edge.b[1] - edge.a[1]) * t),
      ];
      const p = at(sorted[i]);
      const q = at(sorted[i + 1]);
      if (Math.hypot(q[0] - p[0], q[1] - p[1]) < EPS) continue;
      // Same key whatever the direction (the neighbor walks the other way).
      const [ka, kb] = [keyOf(p), keyOf(q)].sort();
      const key = `${ka}|${kb}`;
      const wall = walls.get(key);
      if (!wall) {
        const [a, b] = keyOf(p) === ka ? [p, q] : [q, p];
        walls.set(key, { a, b, height: edge.room.height, rooms: [edge.room.id] });
      } else if (!wall.rooms.includes(edge.room.id)) {
        wall.rooms.push(edge.room.id);
        wall.height = Math.max(wall.height, edge.room.height);
      }
    }
  }
  return [...walls.values()];
}

export const wallLength = (wall: { a: Point; b: Point }) =>
  Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
