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
/** The plan is drawn in centimeters: snapping makes 3.0 and 3.0008 the same line. */
const snap = (p: Point): Point => [
  Math.round(p[0] * 100) / 100,
  Math.round(p[1] * 100) / 100,
];
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
  const points = room.points.map(snap);
  return points
    .map((a, i) => ({ a, b: points[(i + 1) % points.length], room }))
    .filter((edge) => wallLength(edge) > EPS); // repeated point: no edge
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
      // Tolerance in meters (t is a fraction of the edge).
      const length = wallLength(edge);
      for (const t of [ta, tb])
        if (t * length > EPS && (1 - t) * length > EPS) cuts.add(t);
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
      // Same key and direction whatever way the room walks the edge: always
      // from the smaller x (then the smaller y), so collinear walls line up.
      const [a, b] =
        p[0] < q[0] || (p[0] === q[0] && p[1] < q[1]) ? [p, q] : [q, p];
      const key = `${keyOf(a)}|${keyOf(b)}`;
      const wall = walls.get(key);
      if (!wall) {
        walls.set(key, {
          a,
          b,
          height: edge.room.height,
          rooms: [edge.room.id],
        });
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

/** An opening in the walls: a door (bottom 0) or a window, in meters. */
export type Opening = { a: Point; b: Point; bottom: number; top: number };

/**
 * A solid part of a wall, from `bottom` to `top` meters high. `extendA` /
 * `extendB`: the end touches a corner (not an opening), so the 3D box grows
 * half a thickness there to close the corner.
 */
export type WallPiece = {
  a: Point;
  b: Point;
  bottom: number;
  top: number;
  extendA: boolean;
  extendB: boolean;
};

/** Cuts the openings out of the walls: solid parts, sills and lintels. */
export function wallPieces(
  walls: readonly WallSegment[],
  openings: readonly Opening[],
): WallPiece[] {
  const pieces: WallPiece[] = [];
  for (const wall of walls) {
    const length = wallLength(wall);
    const point = (t: number): Point => [
      round(wall.a[0] + ((wall.b[0] - wall.a[0]) * t) / length),
      round(wall.a[1] + ((wall.b[1] - wall.a[1]) * t) / length),
    ];
    // Openings on this wall, as [start, end, bottom, top] in meters from wall.a.
    const found = openings
      .flatMap((o) => {
        const ta = along(wall.a, wall.b, o.a);
        const tb = along(wall.a, wall.b, o.b);
        if (ta === null || tb === null) return [];
        const start = Math.max(0, Math.min(ta, tb) * length);
        const end = Math.min(length, Math.max(ta, tb) * length);
        return end - start > EPS
          ? [{ start, end, bottom: o.bottom, top: o.top }]
          : [];
      })
      .sort((x, y) => x.start - y.start);
    // Overlapping openings (a door inside a glass door) become one hole.
    const holes: typeof found = [];
    for (const hole of found) {
      const last = holes.at(-1);
      if (last && hole.start < last.end - EPS) {
        last.end = Math.max(last.end, hole.end);
        last.bottom = Math.min(last.bottom, hole.bottom);
        last.top = Math.max(last.top, hole.top);
      } else holes.push({ ...hole });
    }

    const add = (piece: WallPiece) => {
      if (wallLength(piece) > EPS && piece.top - piece.bottom > EPS)
        pieces.push(piece);
    };
    let cursor = 0;
    for (const { start, end, bottom, top } of holes) {
      add({
        a: point(cursor),
        b: point(start),
        bottom: 0,
        top: wall.height,
        extendA: cursor === 0,
        extendB: false,
      });
      // Sill and lintel close the corner when the hole touches it.
      const hole = {
        a: point(start),
        b: point(end),
        extendA: start <= EPS,
        extendB: end >= length - EPS,
      };
      add({ ...hole, bottom: 0, top: Math.min(bottom, wall.height) }); // sill
      add({ ...hole, bottom: top, top: wall.height }); // lintel
      cursor = end;
    }
    add({
      a: point(cursor),
      b: wall.b,
      bottom: 0,
      top: wall.height,
      extendA: cursor === 0,
      extendB: true,
    });
  }
  return pieces;
}
