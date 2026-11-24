"use client";

import {
  AppWindow,
  DoorOpen,
  Minus,
  MousePointer2,
  Plus,
  SquarePen,
  Undo2,
  Wand2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { planDoors, roomsReachable } from "@/lib/planta/doors";
import {
  freeName,
  type Handle,
  HANDLES,
  handlePoint,
  movePoints,
  overlapPairs,
  rectFromCorners,
  resizeRect,
  snap,
} from "@/lib/planta/editor";
import {
  bounds,
  labelPoint,
  polygonToRect,
  rectToPolygon,
  roundArea,
} from "@/lib/planta/geometry";
import {
  carryOpenings,
  type DraftOpening,
  nearestWall,
  newOpeningKey,
  OPENING_DEFAULTS,
  OPENING_WIDTHS,
  type OpeningKind,
  openingState,
  openingsFromPlan,
  overlappingOpenings,
  placeOnWall,
  planFromOpenings,
  slideOpening,
  wallOf,
  wallRule,
  wallsOf,
  widthOf,
} from "@/lib/planta/openings";
import {
  type PlanRoomInput,
  type PlanSaveInput,
  planSaveSchema,
  ROOM_TYPES,
  type RoomType,
} from "@/lib/validacoes/comodo";
import { formatDecimal } from "@/lib/validacoes/numero";
import type { FloorPlan, Point } from "@/lib/validacoes/planta";
import { cn } from "cn";

// Visual floor plan editor (issues #105 and #106): the broker draws
// rectangles on a 1 m grid (snap 10 cm), moves and resizes them, puts doors
// and windows on the walls, and saves the whole plan at once. Nothing is
// saved until "Salvar planta". The numeric form ("Medidas") stays as the
// accessible alternative and for fine adjustments.

export type PlanEditorRoom = {
  id: string;
  name: string;
  type: RoomType;
  description: string | null;
  points: Point[];
  ceilingHeight: number;
};

type DraftRoom = {
  key: string;
  id: string | null;
  name: string;
  type: RoomType;
  description: string;
  ceilingHeight: number;
  points: Point[];
};

type Snapshot = { rooms: DraftRoom[]; openings: DraftOpening[] };

type State = Snapshot & {
  past: Snapshot[];
  /** Key of the selected room OR opening (keys never repeat between them). */
  selected: string | null;
  /** Last field edit, so typing a name makes ONE undo step, not one per key. */
  lastEdit: string | null;
};

type Action =
  | { type: "add"; room: DraftRoom }
  | {
      type: "shape";
      key: string;
      points: Point[];
      /** A plain move: the doors and windows on its walls go with it. */
      carry?: Point;
    }
  | {
      type: "edit";
      key: string;
      field: "name" | "type" | "description" | "ceilingHeight";
      value: string | number;
    }
  | { type: "remove"; key: string }
  | { type: "addOpening"; opening: DraftOpening }
  | { type: "setOpening"; opening: DraftOpening }
  | { type: "removeOpening"; key: string }
  | { type: "setOpenings"; openings: DraftOpening[] }
  | { type: "select"; key: string | null }
  | { type: "undo" };

const TYPE_LABEL = Object.fromEntries(ROOM_TYPES) as Record<RoomType, string>;

function reducer(state: State, action: Action): State {
  const save = (
    next: Partial<Snapshot>,
    lastEdit: string | null = null,
  ): State => ({
    ...state,
    ...next,
    past: [
      ...state.past,
      { rooms: state.rooms, openings: state.openings },
    ].slice(-50),
    lastEdit,
  });
  switch (action.type) {
    case "add":
      return {
        ...save({ rooms: [...state.rooms, action.room] }),
        selected: action.room.key,
      };
    case "shape": {
      const before = state.rooms.find((r) => r.key === action.key);
      return save({
        rooms: state.rooms.map((r) =>
          r.key === action.key ? { ...r, points: action.points } : r,
        ),
        openings:
          before && action.carry
            ? carryOpenings(
                state.openings,
                before.points,
                action.carry[0],
                action.carry[1],
              )
            : state.openings,
      });
    }
    case "edit": {
      const rooms = state.rooms.map((r) => {
        if (r.key !== action.key) return r;
        const edited = { ...r, [action.field]: action.value };
        // Choosing the type renames a still-default name ("Cômodo 2" → "Quarto").
        if (action.field === "type" && /^Cômodo( \d+)?$/.test(r.name))
          edited.name = freeName(
            TYPE_LABEL[action.value as RoomType],
            state.rooms.filter((o) => o.key !== r.key).map((o) => o.name),
          );
        return edited;
      });
      const editKey = `${action.key}:${action.field}`;
      // Same field of the same room as the last edit: no new undo step.
      return state.lastEdit === editKey
        ? { ...state, rooms }
        : save({ rooms }, editKey);
    }
    case "remove":
      return {
        ...save({ rooms: state.rooms.filter((r) => r.key !== action.key) }),
        selected: null,
      };
    case "addOpening":
      return {
        ...save({ openings: [...state.openings, action.opening] }),
        selected: action.opening.key,
      };
    case "setOpening":
      return save({
        openings: state.openings.map((o) =>
          o.key === action.opening.key ? action.opening : o,
        ),
      });
    case "removeOpening":
      return {
        ...save({
          openings: state.openings.filter((o) => o.key !== action.key),
        }),
        selected: null,
      };
    case "setOpenings":
      return { ...save({ openings: action.openings }), selected: null };
    case "select":
      return { ...state, selected: action.key, lastEdit: null };
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      const exists =
        previous.rooms.some((r) => r.key === state.selected) ||
        previous.openings.some((o) => o.key === state.selected);
      return {
        ...previous,
        past: state.past.slice(0, -1),
        selected: exists ? state.selected : null,
        lastEdit: null,
      };
    }
  }
}

type Tool = "select" | "draw" | "door" | "window";

type Drag =
  | { kind: "draw"; start: Point; current: Point }
  | { kind: "move"; key: string; origin: Point; current: Point }
  | { kind: "resize"; key: string; handle: Handle; current: Point }
  | { kind: "slide"; key: string; origin: Point; current: Point }
  /** Door/window tool: a tap places it; a drag (scrolling) doesn't. */
  | { kind: "tap"; start: Point; current: Point };

const PAD = 0.6; // meters of margin around the grid
const ZOOMS = [1, 1.5, 2, 3] as const;

const toDraft = (room: PlanEditorRoom): DraftRoom => ({
  key: room.id,
  id: room.id,
  name: room.name,
  type: room.type,
  description: room.description ?? "",
  ceilingHeight: room.ceilingHeight,
  points: room.points,
});

/** The rooms as the wall and door code sees them. */
const asWallRooms = (rooms: readonly DraftRoom[]) =>
  rooms.map((r) => ({
    id: r.key,
    type: r.type,
    points: r.points,
    height: r.ceilingHeight,
  }));

/**
 * What the server receives (and what "unsaved changes" compares): trimmed
 * like the server stores it, so a trailing space doesn't stay "unsaved".
 */
function toInput(rooms: DraftRoom[]): PlanRoomInput[] {
  return rooms.map((room) => ({
    id: room.id,
    name: room.name.trim(),
    type: room.type,
    description: room.description.trim(),
    ceilingHeight: room.ceilingHeight,
    points: room.points,
  }));
}

/** The rooms as they look right now, with the drag in progress applied. */
function applyDrag(rooms: DraftRoom[], drag: Drag | null): DraftRoom[] {
  if (!drag || (drag.kind !== "move" && drag.kind !== "resize")) return rooms;
  return rooms.map((room) => {
    if (room.key !== drag.key) return room;
    if (drag.kind === "move")
      return {
        ...room,
        points: movePoints(
          room.points,
          drag.current[0] - drag.origin[0],
          drag.current[1] - drag.origin[1],
        ),
      };
    const rect = polygonToRect(room.points);
    return rect
      ? {
          ...room,
          points: rectToPolygon(resizeRect(rect, drag.handle, drag.current)),
        }
      : room;
  });
}

/** How far a room moved (only for a plain move: same shape, shifted). */
function shiftOf(before: readonly Point[], after: readonly Point[]) {
  const dx = after[0][0] - before[0][0];
  const dy = after[0][1] - before[0][1];
  const same = before.every(
    (p, i) =>
      Math.abs(p[0] + dx - after[i][0]) < 1e-6 &&
      Math.abs(p[1] + dy - after[i][1]) < 1e-6,
  );
  return same && (dx || dy) ? ([dx, dy] as Point) : undefined;
}

let draftCounter = 0;
const newKey = () => `novo-${++draftCounter}`;

export function FloorPlanEditor({
  rooms: initialRooms,
  plan: initialPlan,
  onSave,
  onDirtyChange,
}: {
  rooms: PlanEditorRoom[];
  /** Saved doors and windows (tipologias.planta); none: automatic doors. */
  plan?: Pick<FloorPlan, "portas" | "janelas" | "portas_definidas">;
  /** Saves the whole plan; returns an error message, or null when saved. */
  onSave: (plan: PlanSaveInput) => Promise<string | null>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const rooms = initialRooms.map(toDraft);
    return {
      rooms,
      openings: openingsFromPlan(asWallRooms(rooms), initialPlan),
      past: [],
      selected: null,
      lastEdit: null,
    };
  });
  const [drag, setDrag] = useState<Drag | null>(null);
  const [tool, setTool] = useState<Tool>(
    initialRooms.length === 0 ? "draw" : "select",
  );
  /** Short message about the last tap (e.g. "a window goes outside"). */
  const [hint, setHint] = useState<string | null>(null);
  /** First corner of a "tap, tap" drawing (phones). */
  const [corner, setCorner] = useState<Point | null>(null);
  const [zoom, setZoom] = useState<(typeof ZOOMS)[number]>(1);
  const [pending, startTransition] = useTransition();
  const svgRef = useRef<SVGSVGElement>(null);
  const helpId = useId();

  const rooms = applyDrag(state.rooms, drag);
  const walls = useMemo(() => wallsOf(asWallRooms(rooms)), [rooms]);
  // Openings as they look now: the one being dragged, or carried by a room.
  const openings = state.openings.map((o) =>
    drag?.kind === "slide" && drag.key === o.key ? slid(o, drag) : o,
  );
  const movingRoom =
    drag?.kind === "move"
      ? state.rooms.find((r) => r.key === drag.key)
      : undefined;
  const movedTo = movingRoom && rooms.find((r) => r.key === movingRoom.key);
  const shownOpenings =
    movingRoom && movedTo
      ? carryOpenings(
          openings,
          movingRoom.points,
          ...((shiftOf(movingRoom.points, movedTo.points) ?? [0, 0]) as [
            number,
            number,
          ]),
        )
      : openings;

  const selected = rooms.find((r) => r.key === state.selected) ?? null;
  const selectedOpening =
    shownOpenings.find((o) => o.key === state.selected) ?? null;
  const selectedRect = selected ? polygonToRect(selected.points) : null;
  const drawnRect =
    drag?.kind === "draw" ? rectFromCorners(drag.start, drag.current) : null;
  const overlaps = overlapPairs(rooms);
  const stacked = overlappingOpenings(shownOpenings);
  const overlapping = new Set(overlaps.flatMap(([a, b]) => [a.key, b.key]));

  // What would be saved, and what the page loaded (to know if it changed).
  const wallRooms = asWallRooms(state.rooms);
  const { plan: openingsPlan, dropped } = planFromOpenings(
    wallRooms,
    state.openings,
  );
  const initialSignature = useMemo(() => {
    const rooms = initialRooms.map(toDraft);
    const openings = openingsFromPlan(asWallRooms(rooms), initialPlan);
    return JSON.stringify([
      toInput(rooms),
      planFromOpenings(asWallRooms(rooms), openings).plan,
    ]);
  }, [initialRooms, initialPlan]);
  const dirty =
    JSON.stringify([toInput(state.rooms), openingsPlan]) !== initialSignature;
  // The rooms the broker took out: only these are deleted when saving.
  const removed = initialRooms
    .map((room) => room.id)
    .filter((id) => !state.rooms.some((room) => room.id === id));
  const toSave: PlanSaveInput = {
    rooms: toInput(state.rooms),
    removed,
    plan: openingsPlan,
  };
  // Same Zod rules as the server (name, area, overlaps), checked here first.
  const check = planSaveSchema.safeParse(toSave);
  const problem = check.success ? null : check.error.issues[0];
  const problemIndex =
    problem && typeof problem.path[1] === "number" ? problem.path[1] : null;
  const invalidKey =
    problemIndex !== null ? state.rooms[problemIndex]?.key : null;

  // Rooms nobody can walk into: the tour opens a door to them when it can
  // (a stretch of shared wall of 0,9 m or more); otherwise they stay closed.
  const hub =
    state.rooms.find((r) => r.type === "sala" || r.type === "outro") ??
    state.rooms[0];
  const doorsForReach = [
    ...openingsPlan.portas.map((d) => ({ a: d.de, b: d.ate })),
    ...openingsPlan.janelas
      .filter((w) => w.peitoril === 0)
      .map((w) => ({ a: w.de, b: w.ate })),
  ];
  const reached =
    hub && state.rooms.length > 1
      ? roomsReachable(wallRooms, doorsForReach, hub.key)
      : null;
  const glassForReach = doorsForReach.slice(openingsPlan.portas.length);
  const reachedInTour =
    hub && state.rooms.length > 1
      ? roomsReachable(
          wallRooms,
          [
            ...planDoors(wallRooms, openingsPlan.portas, glassForReach, true),
            ...glassForReach,
          ],
          hub.key,
        )
      : null;
  const closedRooms = reached
    ? state.rooms.filter((r) => !reached.has(r.key)).map((r) => r.name)
    : [];
  const lockedRooms = reachedInTour
    ? state.rooms.filter((r) => !reachedInTour.has(r.key)).map((r) => r.name)
    : [];

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  // Leaving the page with unsaved changes: the browser asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Grid size: the plan plus 3 m to draw, at least 12 × 9 m. It only grows
  // while dragging (never jumps under the finger).
  const box = bounds([[[0, 0]], ...state.rooms.map((r) => r.points)]);
  const width = Math.min(100, Math.max(12, Math.ceil(box.x1) + 3));
  const height = Math.min(100, Math.max(9, Math.ceil(box.y1) + 3));
  const vbWidth = width + PAD * 2;
  const vbHeight = height + PAD * 2;
  const sx = (x: number) => x + PAD;
  const sy = (y: number) => height - y + PAD;
  const path = (points: readonly Point[]) =>
    points.map(([x, y], i) => `${i ? "L" : "M"}${sx(x)},${sy(y)}`).join(" ") +
    " Z";
  const label = Math.max(0.25, Math.min(vbWidth, vbHeight) / 30);
  const handleRadius = Math.max(0.12, vbWidth / 70) / zoom;
  /** How close to a wall a tap must be (bigger when zoomed out). */
  const wallReach = Math.max(0.3, vbWidth / 35) / zoom;

  /** Pointer position on the screen → plan meters (Y up). */
  const toPlan = useCallback(
    (event: { clientX: number; clientY: number }): Point | null => {
      const svg = svgRef.current;
      const matrix = svg?.getScreenCTM();
      if (!svg || !matrix) return null;
      const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        matrix.inverse(),
      );
      return [p.x - PAD, height - (p.y - PAD)];
    },
    [height],
  );

  function chooseTool(next: Tool) {
    setTool((current) => (current === next ? "select" : next));
    setCorner(null);
    setHint(null);
  }

  function startDrag(event: React.PointerEvent, next: Drag) {
    event.preventDefault();
    event.stopPropagation();
    // preventDefault also stops the focus: give it back, so the arrows work
    // right after a click (without scrolling the page).
    svgRef.current?.focus({ preventScroll: true });
    svgRef.current?.setPointerCapture(event.pointerId);
    setDrag(next);
  }

  /** The dragged opening: moved by how far the pointer went (not to it). */
  function slid(
    o: DraftOpening,
    d: { origin: Point; current: Point },
  ): DraftOpening {
    const dx = d.current[0] - d.origin[0];
    const dy = d.current[1] - d.origin[1];
    if (Math.hypot(dx, dy) < 0.05) return o; // a tap only selects it
    const center: Point = [
      (o.a[0] + o.b[0]) / 2 + dx,
      (o.a[1] + o.b[1]) / 2 + dy,
    ];
    return slideOpening(walls, o, center);
  }

  function placeOpening(point: Point) {
    const kind: OpeningKind = tool === "door" ? "porta" : "janela";
    const wall = nearestWall(walls, point, wallReach);
    if (!wall) {
      setHint("Toque em cima de uma parede.");
      return;
    }
    const rule = wallRule(kind, wall);
    if (rule) {
      setHint(rule);
      return;
    }
    const defaults = OPENING_DEFAULTS[kind];
    const placed = placeOnWall(wall, point, defaults.width);
    if (!placed) {
      setHint("Esta parede é curta demais.");
      return;
    }
    if (
      overlappingOpenings([...state.openings, { key: "nova", ...placed }]).has(
        "nova",
      )
    ) {
      setHint("Já tem uma porta ou janela aqui. Toque em outro ponto.");
      return;
    }
    setHint(null);
    dispatch({
      type: "addOpening",
      opening: {
        key: newOpeningKey(),
        kind,
        ...placed,
        sill: defaults.sill,
        height: defaults.height,
      },
    });
    setTool("select"); // adjust it now; the tool again for the next one
  }

  function onBackgroundDown(event: React.PointerEvent) {
    const point = toPlan(event);
    if (tool === "draw") {
      if (point)
        startDrag(event, { kind: "draw", start: point, current: point });
      return;
    }
    if (tool === "door" || tool === "window") {
      // Placed on release, if the finger didn't move (a swipe scrolls).
      if (point) setDrag({ kind: "tap", start: point, current: point });
      return;
    }
    dispatch({ type: "select", key: null });
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!drag) return;
    const point = toPlan(event);
    if (point) setDrag({ ...drag, current: point });
  }

  function onPointerUp(event: React.PointerEvent) {
    if (!drag) return;
    const point = toPlan(event) ?? drag.current;
    if (drag.kind === "draw") {
      // A drag draws at once; a tap marks a corner (tap again: the other one).
      const rect =
        rectFromCorners(drag.start, point) ??
        (corner ? rectFromCorners(corner, point) : null);
      if (rect) {
        addRoom(rectToPolygon(rect));
        setCorner(null);
      } else {
        setCorner([snap(point[0]), snap(point[1])]);
      }
    } else if (drag.kind === "tap") {
      if (
        Math.hypot(point[0] - drag.start[0], point[1] - drag.start[1]) <
        wallReach
      )
        placeOpening(drag.start);
    } else if (drag.kind === "slide") {
      const before = state.openings.find((o) => o.key === drag.key);
      const after = before && slid(before, { ...drag, current: point });
      if (before && after && JSON.stringify(after) !== JSON.stringify(before))
        dispatch({ type: "setOpening", opening: after });
    } else {
      const moved = applyDrag(state.rooms, { ...drag, current: point }).find(
        (r) => r.key === drag.key,
      );
      const before = state.rooms.find((r) => r.key === drag.key);
      if (
        moved &&
        before &&
        JSON.stringify(moved.points) !== JSON.stringify(before.points)
      )
        dispatch({
          type: "shape",
          key: drag.key,
          points: moved.points,
          carry:
            drag.kind === "move"
              ? shiftOf(before.points, moved.points)
              : undefined,
        });
    }
    setDrag(null);
  }

  function addRoom(points: Point[]) {
    dispatch({
      type: "add",
      room: {
        key: newKey(),
        id: null,
        name: freeName(
          "Cômodo",
          state.rooms.map((r) => r.name),
        ),
        type: "outro",
        description: "",
        ceilingHeight: 2.7,
        points,
      },
    });
    setTool("select"); // name it now; "Cômodo" again for the next
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      dispatch({ type: "undo" });
      return;
    }
    if (event.key === "Escape") {
      setTool("select");
      setCorner(null);
      setHint(null);
      dispatch({ type: "select", key: null });
      return;
    }
    const step = 0.1;
    const arrows: Record<string, Point> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const delta = arrows[event.key];
    if (selectedOpening) {
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        dispatch({ type: "removeOpening", key: selectedOpening.key });
      } else if (delta) {
        // Arrows slide it along its wall.
        event.preventDefault();
        const center: Point = [
          (selectedOpening.a[0] + selectedOpening.b[0]) / 2 + delta[0],
          (selectedOpening.a[1] + selectedOpening.b[1]) / 2 + delta[1],
        ];
        dispatch({
          type: "setOpening",
          opening: slideOpening(walls, selectedOpening, center),
        });
      }
      return;
    }
    if (!selected) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      dispatch({ type: "remove", key: selected.key });
      return;
    }
    if (!delta) return;
    event.preventDefault();
    if (event.shiftKey && selectedRect) {
      // Shift + arrows: change the size (right side and top side).
      const rect = resizeRect(
        resizeRect(selectedRect, "e", [
          selectedRect.x + selectedRect.width + delta[0],
          0,
        ]),
        "n",
        [0, selectedRect.y + selectedRect.depth + delta[1]],
      );
      dispatch({
        type: "shape",
        key: selected.key,
        points: rectToPolygon(rect),
      });
    } else {
      const points = movePoints(selected.points, delta[0], delta[1]);
      dispatch({
        type: "shape",
        key: selected.key,
        points,
        carry: shiftOf(selected.points, points),
      });
    }
  }

  function suggestDoors() {
    // Only the doors between rooms are redone; the entrance door stays.
    const isInterior = (o: DraftOpening) =>
      (wallOf(walls, o)?.rooms.length ?? 0) > 1;
    const glass = state.openings
      .filter((o) => o.kind === "vidro")
      .map((o) => ({ a: o.a, b: o.b }));
    const doors = planDoors(wallRooms, [], glass).map((d): DraftOpening => ({
      key: newOpeningKey(),
      kind: "porta",
      a: d.a,
      b: d.b,
      sill: 0,
      height: OPENING_DEFAULTS.porta.height,
    }));
    dispatch({
      type: "setOpenings",
      openings: [
        ...state.openings.filter((o) => o.kind !== "porta" || !isInterior(o)),
        ...doors,
      ],
    });
    setHint(
      doors.length
        ? `${doors.length} porta(s) sugerida(s) entre os cômodos.`
        : "Nenhuma porta a sugerir.",
    );
  }

  function save() {
    startTransition(async () => {
      try {
        const error = await onSave(toSave);
        if (error) toast.error(error);
        else toast.success("Planta salva.");
      } catch {
        toast.error(
          "Não foi possível conectar. Verifique a internet e tente de novo.",
        );
      }
    });
  }

  const gridLines = [];
  for (let x = 0; x <= width; x++)
    gridLines.push(
      <line key={`x${x}`} x1={sx(x)} x2={sx(x)} y1={sy(0)} y2={sy(height)} />,
    );
  for (let y = 0; y <= height; y++)
    gridLines.push(
      <line key={`y${y}`} x1={sx(0)} x2={sx(width)} y1={sy(y)} y2={sy(y)} />,
    );

  const measuring =
    drawnRect ??
    (drag && (drag.kind === "move" || drag.kind === "resize") && selectedRect
      ? selectedRect
      : null);

  const tools: [Tool, string, typeof SquarePen][] = [
    ["select", "Selecionar", MousePointer2],
    ["draw", "Cômodo", SquarePen],
    ["door", "Porta", DoorOpen],
    ["window", "Janela", AppWindow],
  ];
  const helpText = {
    select:
      "Toque num cômodo, porta ou janela para escolher; arraste para mover. No teclado: setas movem, Shift + setas mudam o tamanho.",
    draw: corner
      ? "Agora toque no canto oposto (ou arraste para desenhar)."
      : "Arraste na grade para desenhar um cômodo, ou toque em dois cantos. Cada quadrado é 1 m.",
    door: "Toque numa parede para pôr uma porta (entre cômodos ou na entrada).",
    window:
      "Toque numa parede de fora para pôr uma janela. Entre a sala e a varanda, use uma porta de vidro.",
  }[tool];

  return (
    <div className="flex flex-col gap-3" data-testid="plan-editor">
      <div
        role="toolbar"
        aria-label="Ferramentas da planta"
        className="flex flex-wrap items-center gap-2"
      >
        <div className="flex flex-wrap gap-1 rounded-lg border p-1">
          {tools.map(([value, text, Icon]) => (
            <Button
              key={value}
              size="sm"
              variant={tool === value ? "default" : "ghost"}
              aria-pressed={tool === value}
              onClick={() => chooseTool(value)}
            >
              <Icon aria-hidden />
              {text}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!state.past.length}
          onClick={() => dispatch({ type: "undo" })}
        >
          <Undo2 aria-hidden />
          Desfazer
        </Button>
        {tool === "door" && (
          <Button size="sm" variant="ghost" onClick={suggestDoors}>
            <Wand2 aria-hidden />
            Sugerir portas
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Diminuir o zoom"
            disabled={zoom === ZOOMS[0]}
            onClick={() => setZoom(ZOOMS[Math.max(0, ZOOMS.indexOf(zoom) - 1)])}
          >
            <Minus aria-hidden />
          </Button>
          <span className="w-10 text-center text-sm tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Aumentar o zoom"
            disabled={zoom === ZOOMS.at(-1)}
            onClick={() =>
              setZoom(
                ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + 1)],
              )
            }
          >
            <Plus aria-hidden />
          </Button>
        </div>
      </div>

      <p id={helpId} className="text-sm text-muted-foreground">
        {helpText}
      </p>
      {hint && (
        <p
          role="status"
          className="text-sm text-amber-800"
          data-testid="plan-hint"
        >
          {hint}
        </p>
      )}

      <div className="max-h-[70vh] overflow-auto rounded-lg border bg-card">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${vbWidth} ${vbHeight}`}
          style={{
            // At 100% the whole grid fits the box (by width AND by height).
            width: `min(${zoom * 100}%, ${((zoom * 68 * vbWidth) / vbHeight).toFixed(2)}vh)`,
            // Drawing: the finger draws. Otherwise an empty spot scrolls.
            touchAction: tool === "draw" ? "none" : "pan-x pan-y",
          }}
          className={cn(
            "mx-auto block outline-none focus-visible:ring-2 focus-visible:ring-ring",
            tool !== "select" && "cursor-crosshair",
          )}
          role="application"
          aria-label={`Planta com ${rooms.length} cômodos e ${shownOpenings.length} portas e janelas. ${selected ? `Selecionado: ${selected.name}.` : selectedOpening ? `Selecionada: ${OPENING_DEFAULTS[selectedOpening.kind].label}.` : ""}`}
          aria-describedby={helpId}
          tabIndex={0}
          onPointerDown={onBackgroundDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setDrag(null)}
          onKeyDown={onKeyDown}
          data-testid="plan-canvas"
          data-pad={PAD}
          data-height={height}
        >
          <g className="stroke-border" strokeWidth={0.02}>
            {gridLines}
          </g>
          {rooms.map((room) => {
            const isSelected = room.key === state.selected;
            const isOverlap =
              overlapping.has(room.key) || room.key === invalidKey;
            const [lx, ly] = labelPoint(room.points);
            return (
              <g
                key={room.key}
                data-testid="plan-room"
                data-name={room.name}
                style={{ touchAction: "none" }}
                className={tool === "select" ? "cursor-move" : ""}
                onPointerDown={(event) => {
                  if (tool !== "select") return; // the background handles it
                  // Never reaches the background (it would unselect).
                  event.stopPropagation();
                  dispatch({ type: "select", key: room.key });
                  const point = toPlan(event);
                  if (point)
                    startDrag(event, {
                      kind: "move",
                      key: room.key,
                      origin: point,
                      current: point,
                    });
                }}
              >
                <path
                  d={path(room.points)}
                  className={cn(
                    isOverlap
                      ? "fill-destructive/20 stroke-destructive"
                      : isSelected
                        ? "fill-primary/20 stroke-primary"
                        : "fill-muted stroke-foreground/60",
                  )}
                  strokeWidth={isSelected ? 0.08 : 0.05}
                  strokeLinejoin="round"
                />
                <text
                  x={sx(lx)}
                  y={sy(ly) - label * 0.15}
                  textAnchor="middle"
                  fontSize={label}
                  className="pointer-events-none fill-foreground font-medium select-none"
                >
                  {room.name}
                </text>
                <text
                  x={sx(lx)}
                  y={sy(ly) + label * 1.05}
                  textAnchor="middle"
                  fontSize={label * 0.85}
                  className="pointer-events-none fill-muted-foreground select-none"
                >
                  {formatDecimal(roundArea(room.points))} m²
                </text>
              </g>
            );
          })}

          {/* Doors (amber) and windows (blue; glass doors dashed). */}
          {shownOpenings.map((o) => {
            const isSelected = o.key === state.selected;
            const offWall =
              openingState(walls, o) === "off" || stacked.has(o.key);
            return (
              <g
                key={o.key}
                data-testid="plan-opening"
                data-kind={o.kind}
                style={{ touchAction: "none" }}
                className={tool === "draw" ? "" : "cursor-grab"}
                onPointerDown={(event) => {
                  if (tool === "draw") return;
                  event.stopPropagation();
                  dispatch({ type: "select", key: o.key });
                  setTool("select");
                  const point = toPlan(event);
                  if (point)
                    startDrag(event, {
                      kind: "slide",
                      key: o.key,
                      origin: point,
                      current: point,
                    });
                }}
              >
                <line
                  x1={sx(o.a[0])}
                  y1={sy(o.a[1])}
                  x2={sx(o.b[0])}
                  y2={sy(o.b[1])}
                  stroke="transparent"
                  strokeWidth={0.5}
                />
                <line
                  x1={sx(o.a[0])}
                  y1={sy(o.a[1])}
                  x2={sx(o.b[0])}
                  y2={sy(o.b[1])}
                  className={cn(
                    offWall
                      ? "stroke-destructive"
                      : o.kind === "porta"
                        ? "stroke-amber-600"
                        : "stroke-sky-600",
                  )}
                  strokeWidth={isSelected ? 0.22 : 0.15}
                  strokeDasharray={o.kind === "vidro" ? "0.12 0.06" : undefined}
                  strokeLinecap="butt"
                />
              </g>
            );
          })}

          {/* Handles of the selected rectangle (bigger invisible touch area). */}
          {selectedRect &&
            tool === "select" &&
            HANDLES.map((handle) => {
              const [hx, hy] = handlePoint(selectedRect, handle);
              return (
                <g
                  key={handle}
                  data-testid={`plan-handle-${handle}`}
                  style={{ touchAction: "none" }}
                  className="cursor-pointer"
                  onPointerDown={(event) =>
                    selected &&
                    startDrag(event, {
                      kind: "resize",
                      key: selected.key,
                      handle,
                      current: [hx, hy],
                    })
                  }
                >
                  <circle
                    cx={sx(hx)}
                    cy={sy(hy)}
                    r={handleRadius * 2.4}
                    fill="transparent"
                  />
                  <circle
                    cx={sx(hx)}
                    cy={sy(hy)}
                    r={handleRadius}
                    className="fill-background stroke-primary"
                    strokeWidth={0.04}
                  />
                </g>
              );
            })}

          {drawnRect && (
            <path
              d={path(rectToPolygon(drawnRect))}
              className="fill-primary/10 stroke-primary"
              strokeWidth={0.06}
              strokeDasharray="0.15 0.1"
            />
          )}
          {corner && (
            <circle
              cx={sx(corner[0])}
              cy={sy(corner[1])}
              r={handleRadius}
              className="fill-primary"
            />
          )}

          {/* Live size while drawing or resizing. */}
          {measuring && (
            <text
              x={sx(measuring.x + measuring.width / 2)}
              y={sy(measuring.y + measuring.depth) - label * 0.6}
              textAnchor="middle"
              fontSize={label}
              className="pointer-events-none fill-primary font-semibold select-none"
              data-testid="plan-measure"
            >
              {formatDecimal(measuring.width)} ×{" "}
              {formatDecimal(measuring.depth)} m ·{" "}
              {formatDecimal(roundArea(rectToPolygon(measuring)))} m²
            </text>
          )}
        </svg>
      </div>

      {overlaps.length > 0 ? (
        <p
          role="alert"
          className="text-sm text-destructive"
          data-testid="plan-overlap"
        >
          “{overlaps[0][0].name}” e “{overlaps[0][1].name}” estão um em cima do
          outro. Ajuste antes de salvar.
        </p>
      ) : (
        problem &&
        dirty && (
          <p
            role="alert"
            className="text-sm text-destructive"
            data-testid="plan-problem"
          >
            {problem.code === "invalid_type"
              ? "Confira os cômodos da planta."
              : problem.message}
          </p>
        )
      )}
      {dropped > 0 && (
        <p role="status" className="text-sm text-amber-800">
          {dropped === 1
            ? "Uma porta ou janela ficou fora das paredes (em vermelho) e sai ao salvar."
            : `${dropped} portas ou janelas ficaram fora das paredes (em vermelho) e saem ao salvar.`}
        </p>
      )}
      {stacked.size > 0 && (
        <p role="alert" className="text-sm text-destructive">
          Há duas portas ou janelas no mesmo lugar (em vermelho). Afaste uma
          delas antes de salvar.
        </p>
      )}
      {lockedRooms.length > 0 ? (
        <p
          role="status"
          className="text-sm text-amber-800"
          data-testid="plan-closed"
        >
          Sem acesso: {lockedRooms.join(", ")}. Ponha uma porta, senão o
          visitante não entra nesse cômodo no tour.
        </p>
      ) : (
        closedRooms.length > 0 && (
          <p
            role="status"
            className="text-sm text-muted-foreground"
            data-testid="plan-closed"
          >
            Sem porta: {closedRooms.join(", ")}. No tour, uma porta automática é
            aberta para dar acesso.
          </p>
        )
      )}

      {selected && (
        <RoomPanel
          key={selected.key}
          room={selected}
          onEdit={(field, value) =>
            dispatch({ type: "edit", key: selected.key, field, value })
          }
          onRemove={() => dispatch({ type: "remove", key: selected.key })}
        />
      )}
      {selectedOpening && (
        <OpeningPanel
          key={selectedOpening.key}
          opening={selectedOpening}
          onChange={(kind, newWidth) => {
            const wall = wallOf(walls, selectedOpening);
            if (!wall) return;
            const rule = wallRule(kind, wall);
            if (rule) {
              setHint(rule);
              return;
            }
            const center: Point = [
              (selectedOpening.a[0] + selectedOpening.b[0]) / 2,
              (selectedOpening.a[1] + selectedOpening.b[1]) / 2,
            ];
            const placed = placeOnWall(wall, center, newWidth);
            if (!placed) return;
            const defaults = OPENING_DEFAULTS[kind];
            setHint(null);
            dispatch({
              type: "setOpening",
              opening: {
                ...selectedOpening,
                ...placed,
                kind,
                sill:
                  kind === selectedOpening.kind
                    ? selectedOpening.sill
                    : defaults.sill,
                height:
                  kind === selectedOpening.kind
                    ? selectedOpening.height
                    : defaults.height,
              },
            });
          }}
          onRemove={() =>
            dispatch({ type: "removeOpening", key: selectedOpening.key })
          }
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={save}
          disabled={!dirty || pending || Boolean(problem) || stacked.size > 0}
          data-testid="plan-save"
        >
          {pending ? "Salvando…" : "Salvar planta"}
        </Button>
        {dirty && (
          <span className="text-sm text-muted-foreground" role="status">
            Mudanças ainda não salvas.
          </span>
        )}
      </div>
    </div>
  );
}

function OpeningPanel({
  opening,
  onChange,
  onRemove,
}: {
  opening: DraftOpening;
  onChange: (kind: OpeningKind, width: number) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const width = widthOf(opening);
  const widths = OPENING_WIDTHS.includes(
    width as (typeof OPENING_WIDTHS)[number],
  )
    ? OPENING_WIDTHS
    : [...OPENING_WIDTHS, width].sort((a, b) => a - b);
  return (
    <section
      aria-label={OPENING_DEFAULTS[opening.kind].label}
      className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2"
      data-testid="plan-opening-panel"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-kind`}>Tipo</Label>
        <NativeSelect
          id={`${id}-kind`}
          value={opening.kind}
          onChange={(e) => onChange(e.target.value as OpeningKind, width)}
        >
          {(Object.keys(OPENING_DEFAULTS) as OpeningKind[]).map((kind) => (
            <option key={kind} value={kind}>
              {OPENING_DEFAULTS[kind].label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-width`}>Largura</Label>
        <NativeSelect
          id={`${id}-width`}
          value={String(width)}
          onChange={(e) => onChange(opening.kind, Number(e.target.value))}
        >
          {widths.map((w) => (
            <option key={w} value={String(w)}>
              {formatDecimal(w)} m
            </option>
          ))}
        </NativeSelect>
      </div>
      <p className="text-sm text-muted-foreground sm:col-span-2">
        Arraste ao longo da parede para mudar de lugar (ou use as setas).
      </p>
      <div className="sm:col-span-2">
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Tirar da planta
        </Button>
      </div>
    </section>
  );
}

const CEILINGS = [2.4, 2.5, 2.6, 2.7, 2.8, 3, 3.5, 4, 5, 6];

function RoomPanel({
  room,
  onEdit,
  onRemove,
}: {
  room: DraftRoom;
  onEdit: (
    field: "name" | "type" | "description" | "ceilingHeight",
    value: string | number,
  ) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const rect = polygonToRect(room.points);
  return (
    <section
      aria-label={`Cômodo ${room.name}`}
      className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2"
      data-testid="plan-room-panel"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-name`}>Nome</Label>
        <Input
          id={`${id}-name`}
          value={room.name}
          maxLength={60}
          onChange={(e) => onEdit("name", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-type`}>Tipo</Label>
        <NativeSelect
          id={`${id}-type`}
          value={room.type}
          onChange={(e) => onEdit("type", e.target.value as RoomType)}
        >
          {ROOM_TYPES.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-height`}>Pé-direito (m)</Label>
        <NativeSelect
          id={`${id}-height`}
          value={String(room.ceilingHeight)}
          onChange={(e) => onEdit("ceilingHeight", Number(e.target.value))}
        >
          {CEILINGS.map((h) => (
            <option key={h} value={String(h)}>
              {formatDecimal(h)} m
            </option>
          ))}
          {!CEILINGS.includes(room.ceilingHeight) && (
            <option value={String(room.ceilingHeight)}>
              {formatDecimal(room.ceilingHeight)} m
            </option>
          )}
        </NativeSelect>
      </div>
      <p className="self-end text-sm text-muted-foreground tabular-nums">
        {rect
          ? `${formatDecimal(rect.width)} × ${formatDecimal(rect.depth)} m · `
          : "Formato especial (só move) · "}
        {formatDecimal(roundArea(room.points))} m² · {TYPE_LABEL[room.type]}
      </p>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${id}-description`}>Descrição (opcional)</Label>
        <Textarea
          id={`${id}-description`}
          rows={2}
          value={room.description}
          maxLength={2000}
          placeholder="Piso em porcelanato, janela ampla…"
          onChange={(e) => onEdit("description", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Tirar da planta
        </Button>
      </div>
    </section>
  );
}
