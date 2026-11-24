import { overlapArea, type Rect, rectToPolygon } from "@/lib/planta/geometry";
import type { Point } from "@/lib/validacoes/planta";

// Pure logic of the visual floor plan editor (issue #105): snapping to the
// grid, drawing, moving and resizing rooms, and overlap checks. Meters,
// origin (0,0) at the bottom-left, Y up (same as the stored plan).

/** Grid snap: 10 cm. */
export const SNAP = 0.1;
/** Smallest room side (same rule as the form: 0,5 m). */
export const MIN_SIDE = 0.5;
/** A room needs MORE than 0,5 m² (same rule as the stored plan). */
export const MIN_AREA = 0.5;
/** The plan never goes past 100 m (same as the stored format). */
export const MAX_COORD = 100;

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/** Snaps a coordinate to the 10 cm grid, inside 0..100 m. */
export function snap(value: number): number {
  return round3(clamp(Math.round(value / SNAP) * SNAP, 0, MAX_COORD));
}

/**
 * The rectangle between two corners (any order), snapped. null when it's
 * too small to be a room (a tap, or a side under 0,5 m).
 */
export function rectFromCorners(a: Point, b: Point): Rect | null {
  const x0 = snap(Math.min(a[0], b[0]));
  const x1 = snap(Math.max(a[0], b[0]));
  const y0 = snap(Math.min(a[1], b[1]));
  const y1 = snap(Math.max(a[1], b[1]));
  if (x1 - x0 < MIN_SIDE - 1e-9 || y1 - y0 < MIN_SIDE - 1e-9) return null;
  if ((x1 - x0) * (y1 - y0) <= MIN_AREA + 1e-9) return null;
  return { x: x0, y: y0, width: round3(x1 - x0), depth: round3(y1 - y0) };
}

/**
 * Moves a room (any shape) by (dx, dy), snapped to the grid and kept inside
 * 0..100 m as a whole (it never gets squashed against the border).
 */
export function movePoints(points: readonly Point[], dx: number, dy: number) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  // Snap the moved corner, so the whole room stays on the grid.
  const sdx = clamp(snap(minX + dx) - minX, -minX, MAX_COORD - maxX);
  const sdy = clamp(snap(minY + dy) - minY, -minY, MAX_COORD - maxY);
  return points.map(([x, y]): Point => [round3(x + sdx), round3(y + sdy)]);
}

/** Corner and side handles of a rectangle (n = top, since Y goes up). */
export type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
export const HANDLES: readonly Handle[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

/** Where a handle sits on the rectangle. */
export function handlePoint(rect: Rect, handle: Handle): Point {
  const x = handle.includes("w")
    ? rect.x
    : handle.includes("e")
      ? rect.x + rect.width
      : rect.x + rect.width / 2;
  const y = handle.includes("s")
    ? rect.y
    : handle.includes("n")
      ? rect.y + rect.depth
      : rect.y + rect.depth / 2;
  return [x, y];
}

/**
 * Drags one handle to (x, y): only the edges that handle controls move,
 * snapped, and the room never gets smaller than 0,5 m nor flips over.
 */
export function resizeRect(rect: Rect, handle: Handle, [x, y]: Point): Rect {
  let x0 = rect.x;
  let x1 = rect.x + rect.width;
  let y0 = rect.y;
  let y1 = rect.y + rect.depth;
  if (handle.includes("w")) x0 = Math.min(snap(x), round3(x1 - MIN_SIDE));
  if (handle.includes("e")) x1 = Math.max(snap(x), round3(x0 + MIN_SIDE));
  if (handle.includes("s")) y0 = Math.min(snap(y), round3(y1 - MIN_SIDE));
  if (handle.includes("n")) y1 = Math.max(snap(y), round3(y0 + MIN_SIDE));
  // Too small to be a room (0,5 m²): the handle stops where it was.
  if ((x1 - x0) * (y1 - y0) <= MIN_AREA + 1e-9) return rect;
  return { x: x0, y: y0, width: round3(x1 - x0), depth: round3(y1 - y0) };
}

/** Rooms may touch (shared walls), not overlap: tolerance of 1 cm². */
const OVERLAP_TOLERANCE_M2 = 0.0001;

/**
 * A room as rectangles: an axis-aligned polygon (rectangle, L, U…) is cut in
 * vertical strips, each one a rectangle. Other shapes (slanted walls): their
 * bounding box, a safe approximation.
 */
export function rectsOf(points: readonly Point[]): Rect[] {
  const axisAligned = points.every((p, i) => {
    const q = points[(i + 1) % points.length];
    return Math.abs(p[0] - q[0]) < 1e-9 || Math.abs(p[1] - q[1]) < 1e-9;
  });
  if (!axisAligned) return [boundsRect(points)];
  const xs = [...new Set(points.map((p) => p[0]))].sort((a, b) => a - b);
  const rects: Rect[] = [];
  for (let i = 0; i + 1 < xs.length; i++) {
    const mid = (xs[i] + xs[i + 1]) / 2;
    // Where the vertical line x = mid crosses the horizontal edges.
    const ys: number[] = [];
    for (let k = 0; k < points.length; k++) {
      const [x1, y1] = points[k];
      const [x2, y2] = points[(k + 1) % points.length];
      if (y1 === y2 && Math.min(x1, x2) < mid && mid < Math.max(x1, x2))
        ys.push(y1);
    }
    ys.sort((a, b) => a - b);
    for (let k = 0; k + 1 < ys.length; k += 2)
      rects.push({
        x: xs[i],
        y: ys[k],
        width: xs[i + 1] - xs[i],
        depth: ys[k + 1] - ys[k],
      });
  }
  return rects;
}

/** Overlapping area (m²) of two rooms of any shape the editor handles. */
export function roomsOverlapArea(
  a: readonly Point[],
  b: readonly Point[],
): number {
  return rectsOf(b).reduce((sum, rect) => sum + overlapArea(a, rect), 0);
}

/** Pairs of rooms that overlap (any shape: L-shaped rooms included). */
export function overlapPairs<T extends { points: readonly Point[] }>(
  rooms: readonly T[],
): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];
      if (roomsOverlapArea(a.points, b.points) > OVERLAP_TOLERANCE_M2)
        pairs.push([a, b]);
    }
  }
  return pairs;
}

/** Keys of the rooms that overlap another one (to paint them red). */
export function overlappingKeys<
  T extends { key: string; points: readonly Point[] },
>(rooms: readonly T[]): Set<string> {
  return new Set(overlapPairs(rooms).flatMap(([a, b]) => [a.key, b.key]));
}

function boundsRect(points: readonly Point[]): Rect {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, depth: Math.max(...ys) - y };
}

/** A name that isn't taken yet: "Quarto", then "Quarto 2", "Quarto 3"… */
export function freeName(base: string, taken: readonly string[]): string {
  const names = new Set(taken.map((n) => n.trim().toLowerCase()));
  if (!names.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) {
    const name = `${base} ${n}`;
    if (!names.has(name.toLowerCase())) return name;
  }
}

/** Rectangle → stored polygon (re-exported for the editor). */
export { rectToPolygon };
