import type { Point } from "@/lib/validacoes/planta";

import { collides, type Segment } from "./collision";

// "Tap on the floor to walk there" (issue #108): a path from where the
// visitor is to the tapped spot, around walls (and furniture), through the
// doors. A grid of 20 cm cells marks where the body fits; a search finds the
// way, and the corners are cut where the straight line is free.

const CELL = 0.2;
const MAX_CELLS = 250_000; // a 100 × 100 m plan at 20 cm is the ceiling

export type WalkGrid = {
  x0: number;
  y0: number;
  /** Cell side, meters (20 cm; bigger only on a huge plan). */
  cell: number;
  cols: number;
  rows: number;
  /** 1 = the body fits there. */
  free: Uint8Array;
};

/** Where the body fits, in the plan's bounds (built once per set of walls). */
export function walkGrid(
  walls: readonly Segment[],
  bounds: { x0: number; y0: number; x1: number; y1: number },
): WalkGrid {
  const width = Math.max(bounds.x1 - bounds.x0, CELL);
  const height = Math.max(bounds.y1 - bounds.y0, CELL);
  // Bigger cells on a huge plan, so the whole plan always fits the limit.
  const cell = Math.max(CELL, Math.sqrt((width * height) / MAX_CELLS));
  const cols = Math.max(1, Math.ceil(width / cell));
  const rows = Math.max(1, Math.ceil(height / cell));
  const free = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const p: Point = [
        bounds.x0 + (c + 0.5) * cell,
        bounds.y0 + (r + 0.5) * cell,
      ];
      free[r * cols + c] = collides(p, walls) ? 0 : 1;
    }
  return { x0: bounds.x0, y0: bounds.y0, cell, cols, rows, free };
}

const cellOf = (g: WalkGrid, [x, y]: Point): [number, number] => [
  Math.min(g.cols - 1, Math.max(0, Math.floor((x - g.x0) / g.cell))),
  Math.min(g.rows - 1, Math.max(0, Math.floor((y - g.y0) / g.cell))),
];
const centerOf = (g: WalkGrid, c: number, r: number): Point => [
  g.x0 + (c + 0.5) * g.cell,
  g.y0 + (r + 0.5) * g.cell,
];

/** Is the straight line from a to b walkable (checked every 10 cm)? */
export function clearLine(
  a: Point,
  b: Point,
  walls: readonly Segment[],
): boolean {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const steps = Math.max(1, Math.ceil(length / 0.1));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (collides([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], walls))
      return false;
  }
  return true;
}

/**
 * The way from `from` to `to`: the points to walk through, ending at the
 * target, or at the reachable spot closest to it (a tap outside the unit or
 * behind a closed wall). Empty when there's nowhere to go.
 */
export function findPath(
  grid: WalkGrid,
  walls: readonly Segment[],
  from: Point,
  to: Point,
): Point[] {
  if (clearLine(from, to, walls)) return [to];
  const { cols, rows, free } = grid;
  const index = (c: number, r: number) => r * cols + c;
  const [sc, sr] = cellOf(grid, from);
  const [tc, tr] = cellOf(grid, to);
  // Breadth-first from the start (8 directions, no cutting wall corners).
  const previous = new Int32Array(cols * rows).fill(-2);
  const queue: number[] = [index(sc, sr)];
  previous[index(sc, sr)] = -1;
  let best = index(sc, sr);
  let bestDistance = Infinity;
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    const c = i % cols;
    const r = (i - c) / cols;
    const distance = Math.hypot(c - tc, r - tr);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
      if (distance === 0) break;
    }
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const n = index(nc, nr);
      if (previous[n] !== -2 || !free[n]) continue;
      if (dc && dr && (!free[index(c + dc, r)] || !free[index(c, r + dr)]))
        continue;
      previous[n] = i;
      queue.push(n);
    }
  }
  // Nothing closer than where the visitor already is: stay put.
  if (best === index(sc, sr) && bestDistance > 0) return [];
  // Back from the best cell to the start.
  const cells: Point[] = [];
  for (let i = best; i >= 0; i = previous[i]) {
    const c = i % cols;
    cells.unshift(centerOf(grid, c, (i - c) / cols));
  }
  const goal = bestDistance === 0 && !collides(to, walls) ? to : cells.at(-1);
  if (!goal) return [];
  const route = [...cells.slice(1, -1), goal];
  // Cut the corners: from each point, jump to the farthest one in sight.
  const smooth: Point[] = [];
  let at = from;
  let k = 0;
  while (k < route.length) {
    let far = k;
    for (let j = route.length - 1; j > k; j--)
      if (clearLine(at, route[j], walls)) {
        far = j;
        break;
      }
    smooth.push(route[far]);
    at = route[far];
    k = far + 1;
  }
  return smooth;
}
