import { type Point, polygonArea } from "@/lib/validacoes/planta";

// Floor plan geometry for the room form (issue #32). Meters, origin (0,0) at
// the bottom-left corner; rooms are polygons (the form creates rectangles).

export type Rect = { x: number; y: number; width: number; depth: number };

/** Rectangle → polygon in counter-clockwise order. */
export function rectToPolygon({ x, y, width, depth }: Rect): Point[] {
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return [
    [r(x), r(y)],
    [r(x + width), r(y)],
    [r(x + width), r(y + depth)],
    [r(x), r(y + depth)],
  ];
}

/** The rectangle of an axis-aligned 4-point polygon, or null (L shapes etc.). */
export function polygonToRect(points: readonly Point[]): Rect | null {
  if (points.length !== 4) return null;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const isCorner = (p: Point) =>
    (p[0] === x0 || p[0] === x1) && (p[1] === y0 || p[1] === y1);
  const distinct = new Set(points.map((p) => `${p[0]},${p[1]}`)).size === 4;
  if (!distinct || !points.every(isCorner)) return null;
  return { x: x0, y: y0, width: x1 - x0, depth: y1 - y0 };
}

export function bounds(polygons: readonly (readonly Point[])[]) {
  const all = polygons.flat();
  if (!all.length) return { x0: 0, y0: 0, x1: 0, y1: 0 };
  return {
    x0: Math.min(...all.map((p) => p[0])),
    y0: Math.min(...all.map((p) => p[1])),
    x1: Math.max(...all.map((p) => p[0])),
    y1: Math.max(...all.map((p) => p[1])),
  };
}

/**
 * Clips any simple polygon by an axis-aligned rectangle (Sutherland–Hodgman;
 * works because the clip region is convex). Returns the intersection polygon.
 */
export function clipByRect(polygon: readonly Point[], rect: Rect): Point[] {
  const edges: [(p: Point) => boolean, (a: Point, b: Point) => Point][] = [
    [(p) => p[0] >= rect.x, (a, b) => atX(a, b, rect.x)],
    [
      (p) => p[0] <= rect.x + rect.width,
      (a, b) => atX(a, b, rect.x + rect.width),
    ],
    [(p) => p[1] >= rect.y, (a, b) => atY(a, b, rect.y)],
    [
      (p) => p[1] <= rect.y + rect.depth,
      (a, b) => atY(a, b, rect.y + rect.depth),
    ],
  ];
  let output: Point[] = [...polygon];
  for (const [inside, cross] of edges) {
    const input = output;
    output = [];
    for (let i = 0; i < input.length; i++) {
      const current = input[i];
      const previous = input[(i + input.length - 1) % input.length];
      if (inside(current)) {
        if (!inside(previous)) output.push(cross(previous, current));
        output.push(current);
      } else if (inside(previous)) {
        output.push(cross(previous, current));
      }
    }
    if (!output.length) break;
  }
  return output;
}

function atX(a: Point, b: Point, x: number): Point {
  const t = (x - a[0]) / (b[0] - a[0]);
  return [x, a[1] + t * (b[1] - a[1])];
}
function atY(a: Point, b: Point, y: number): Point {
  const t = (y - a[1]) / (b[1] - a[1]);
  return [a[0] + t * (b[0] - a[0]), y];
}

/** Overlapping area (m²) between a polygon and a rectangle. */
export function overlapArea(polygon: readonly Point[], rect: Rect): number {
  const clipped = clipByRect(polygon, rect);
  return clipped.length >= 3 ? polygonArea(clipped) : 0;
}

/** Rooms may touch (shared walls), not overlap: tolerance of 1 cm². */
const OVERLAP_TOLERANCE_M2 = 0.0001;

/** First room the rectangle overlaps, or null. */
export function findOverlap<
  T extends { name: string; points: readonly Point[] },
>(rect: Rect, others: readonly T[]): T | null {
  return (
    others.find(
      (room) => overlapArea(room.points, rect) > OVERLAP_TOLERANCE_M2,
    ) ?? null
  );
}

/** m² rounded to 2 decimals, as stored in comodos.area_m2. */
export function roundArea(points: readonly Point[]): number {
  return Math.round(polygonArea(points) * 100) / 100;
}
