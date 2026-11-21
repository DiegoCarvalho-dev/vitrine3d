import type { RoomType } from "@/lib/validacoes/comodo";
import type { Point } from "@/lib/validacoes/planta";

import { buildWalls, type PlanRoom, type WallSegment } from "./walls";

// Doors between rooms (issue #49). Until the plan editor (Sprint 8), a door is
// opened automatically where two rooms share at least 0.9 m of wall, following
// simple rules. Doors saved in tipologias.planta.portas always win.

export const DOOR_WIDTH = 0.8;
export const DOOR_HEIGHT = 2.1;
export const MIN_SHARED = 0.9;

export type DoorRoom = PlanRoom & { type: RoomType };
export type Door = { a: Point; b: Point };

const EPS = 1e-3;
const HUBS: RoomType[] = ["sala", "outro"]; // living room and hall open to all

/** The bathroom opens to only one room: the first type on this list. */
const BATHROOM_PREFERENCE: RoomType[] = [
  "suite",
  "outro",
  "sala",
  "quarto",
  "lavanderia",
  "cozinha",
];

type Run = { rooms: [DoorRoom, DoorRoom]; a: Point; b: Point; length: number };

/** Joins the collinear, touching shared walls of each pair of rooms. */
export function sharedRuns(rooms: readonly DoorRoom[]): Run[] {
  const byId = new Map(rooms.map((room) => [room.id, room]));
  const groups = new Map<string, WallSegment[]>();
  for (const wall of buildWalls(rooms)) {
    if (wall.rooms.length !== 2) continue;
    const dx = wall.b[0] - wall.a[0];
    const dy = wall.b[1] - wall.a[1];
    // Same pair + same line (direction and offset) → same group.
    const angle = Math.round(Math.atan2(dy, dx) * 1000);
    const offset = Math.round(
      ((wall.a[0] * dy - wall.a[1] * dx) / Math.hypot(dx, dy)) * 1000,
    );
    const key = `${[...wall.rooms].sort().join("|")}|${angle}|${offset}`;
    groups.set(key, [...(groups.get(key) ?? []), wall]);
  }

  const runs: Run[] = [];
  for (const walls of groups.values()) {
    const [first] = walls;
    const origin = first.a;
    const dx = first.b[0] - origin[0];
    const dy = first.b[1] - origin[1];
    const unit = Math.hypot(dx, dy);
    const at = (p: Point) =>
      ((p[0] - origin[0]) * dx + (p[1] - origin[1]) * dy) / unit;
    const point = (t: number): Point => [
      Math.round((origin[0] + (dx / unit) * t) * 1000) / 1000,
      Math.round((origin[1] + (dy / unit) * t) * 1000) / 1000,
    ];
    const spans = walls
      .map((w) => [at(w.a), at(w.b)].sort((x, y) => x - y))
      .sort((x, y) => x[0] - y[0]);
    let [start, end] = spans[0];
    const pair = first.rooms.map((id) => byId.get(id)!) as [DoorRoom, DoorRoom];
    const flush = () =>
      runs.push({
        rooms: pair,
        a: point(start),
        b: point(end),
        length: end - start,
      });
    for (const [s, e] of spans.slice(1)) {
      if (s <= end + EPS) end = Math.max(end, e);
      else {
        flush();
        [start, end] = [s, e];
      }
    }
    flush();
  }
  return runs;
}

function isAllowed(x: DoorRoom, y: DoorRoom): boolean {
  const types = [x.type, y.type];
  const has = (t: RoomType) => types.includes(t);
  if (has("varanda")) {
    const other = x.type === "varanda" ? y.type : x.type;
    return other === "sala" || other === "quarto" || other === "suite";
  }
  if (has("banheiro")) return true; // limited to one door below
  // The laundry opens to the kitchen only (not to the living room).
  if (has("lavanderia")) return has("cozinha");
  if (types.some((t) => HUBS.includes(t))) return true;
  return false;
}

const otherRoom = (run: Run, room: DoorRoom) =>
  run.rooms[0] === room ? run.rooms[1] : run.rooms[0];

/** A door of DOOR_WIDTH in the middle of the run. */
function doorIn(run: Run): Door {
  const t = (run.length - DOOR_WIDTH) / 2 / run.length;
  const lerp = (u: number): Point => [
    Math.round((run.a[0] + (run.b[0] - run.a[0]) * u) * 1000) / 1000,
    Math.round((run.a[1] + (run.b[1] - run.a[1]) * u) * 1000) / 1000,
  ];
  return { a: lerp(t), b: lerp(1 - t) };
}

/**
 * Doors of the unit: the saved ones (planta.portas) when there are any;
 * otherwise the automatic ones, only between rooms (never exterior walls).
 */
export function planDoors(
  rooms: readonly DoorRoom[],
  saved: readonly { de: Point; ate: Point }[] = [],
): Door[] {
  if (saved.length) return saved.map((d) => ({ a: d.de, b: d.ate }));

  const runs = sharedRuns(rooms).filter((run) => run.length >= MIN_SHARED);
  const chosen = new Set<Run>();
  const hasDoor = (room: DoorRoom) =>
    [...chosen].some((run) => run.rooms.includes(room));
  const bathroomBlocked = (run: Run) =>
    run.rooms.some((room) => room.type === "banheiro" && hasDoor(room));
  const longestFirst = (a: Run, b: Run) => b.length - a.length;

  // 1. Bathrooms: one door, to the preferred neighbor.
  for (const room of rooms.filter((r) => r.type === "banheiro")) {
    const options = runs
      .filter((run) => run.rooms.includes(room))
      .filter((run) => isAllowed(...run.rooms))
      .filter((run) => otherRoom(run, room).type !== "banheiro")
      .sort(
        (a, b) =>
          rank(otherRoom(a, room).type) - rank(otherRoom(b, room).type) ||
          longestFirst(a, b),
      );
    if (options[0]) chosen.add(options[0]);
  }
  // 2. The other allowed pairs (one door per pair: the longest stretch).
  const pairs = new Set<string>();
  for (const run of [...runs].sort(longestFirst)) {
    const pair = run.rooms
      .map((r) => r.id)
      .sort()
      .join("|");
    if (run.rooms.some((r) => r.type === "banheiro")) continue;
    if (!isAllowed(...run.rooms) || pairs.has(pair)) continue;
    pairs.add(pair);
    chosen.add(run);
  }
  // 3. Any room still unreachable from the hall/living room gets a door to a
  //    reachable neighbor (e.g. a bedroom that only touches another bedroom).
  const start = rooms.find((r) => HUBS.includes(r.type)) ?? rooms[0];
  for (let changed = true; changed && start;) {
    changed = false;
    const reached = reachable(start, chosen);
    const bridge = runs
      .filter((run) => !chosen.has(run) && !bathroomBlocked(run))
      .filter((run) => reached.has(run.rooms[0]) !== reached.has(run.rooms[1]))
      .sort(longestFirst)[0];
    if (bridge) {
      chosen.add(bridge);
      changed = true;
    }
  }
  return [...chosen].map(doorIn);
}

const rank = (type: RoomType) => {
  const i = BATHROOM_PREFERENCE.indexOf(type);
  return i < 0 ? BATHROOM_PREFERENCE.length : i;
};

function reachable(start: DoorRoom, doors: Set<Run>) {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const room = queue.shift()!;
    for (const run of doors) {
      if (!run.rooms.includes(room)) continue;
      const next = otherRoom(run, room);
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

/** Rooms reachable from `start` through these doors (for tests and checks). */
export function roomsReachable(
  rooms: readonly DoorRoom[],
  doors: readonly Door[],
  startId: string,
): Set<string> {
  const runs = sharedRuns(rooms);
  const crossing = new Set<Run>();
  for (const door of doors) {
    const mid: Point = [
      (door.a[0] + door.b[0]) / 2,
      (door.a[1] + door.b[1]) / 2,
    ];
    const run = runs.find((r) => onSegment(r.a, r.b, mid));
    if (run) crossing.add(run);
  }
  const start = rooms.find((r) => r.id === startId);
  if (!start) return new Set();
  return new Set([...reachable(start, crossing)].map((r) => r.id));
}

export function onSegment(a: Point, b: Point, p: Point): boolean {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const cross = (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0]);
  if (Math.abs(cross) / length > EPS) return false;
  const t =
    ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) /
    (length * length);
  return t >= -EPS && t <= 1 + EPS;
}
