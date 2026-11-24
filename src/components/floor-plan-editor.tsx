"use client";

import { Minus, MousePointer2, Plus, SquarePen, Undo2 } from "lucide-react";
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
  type PlanRoomInput,
  type PlanSaveInput,
  planSaveSchema,
  ROOM_TYPES,
  type RoomType,
} from "@/lib/validacoes/comodo";
import { formatDecimal } from "@/lib/validacoes/numero";
import type { Point } from "@/lib/validacoes/planta";
import { cn } from "cn";

// Visual floor plan editor (issue #105): the broker draws rectangles on a
// 1 m grid (snap 10 cm), moves and resizes them, and saves the whole plan at
// once. Nothing is saved until "Salvar planta". The numeric form ("Medidas")
// stays as the accessible alternative and for fine adjustments.

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

type State = {
  rooms: DraftRoom[];
  past: DraftRoom[][];
  selected: string | null;
  /** Last field edit, so typing a name makes ONE undo step, not one per key. */
  lastEdit: string | null;
};

type Action =
  | { type: "add"; room: DraftRoom }
  | { type: "shape"; key: string; points: Point[] }
  | {
      type: "edit";
      key: string;
      field: "name" | "type" | "description" | "ceilingHeight";
      value: string | number;
    }
  | { type: "remove"; key: string }
  | { type: "select"; key: string | null }
  | { type: "undo" };

const TYPE_LABEL = Object.fromEntries(ROOM_TYPES) as Record<RoomType, string>;

function reducer(state: State, action: Action): State {
  const save = (rooms: DraftRoom[], lastEdit: string | null = null) => ({
    ...state,
    rooms,
    past: [...state.past, state.rooms].slice(-50),
    lastEdit,
  });
  switch (action.type) {
    case "add":
      return {
        ...save([...state.rooms, action.room]),
        selected: action.room.key,
      };
    case "shape":
      return save(
        state.rooms.map((r) =>
          r.key === action.key ? { ...r, points: action.points } : r,
        ),
      );
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
        : save(rooms, editKey);
    }
    case "remove":
      return {
        ...save(state.rooms.filter((r) => r.key !== action.key)),
        selected: null,
      };
    case "select":
      return { ...state, selected: action.key, lastEdit: null };
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      const selected = previous.some((r) => r.key === state.selected)
        ? state.selected
        : null;
      return {
        rooms: previous,
        past: state.past.slice(0, -1),
        selected,
        lastEdit: null,
      };
    }
  }
}

type Drag =
  | { kind: "draw"; start: Point; current: Point }
  | { kind: "move"; key: string; origin: Point; current: Point }
  | { kind: "resize"; key: string; handle: Handle; current: Point };

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
  if (!drag || drag.kind === "draw") return rooms;
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

let draftCounter = 0;
const newKey = () => `novo-${++draftCounter}`;

export function FloorPlanEditor({
  rooms: initialRooms,
  onSave,
  onDirtyChange,
}: {
  rooms: PlanEditorRoom[];
  /** Saves the whole plan; returns an error message, or null when saved. */
  onSave: (plan: PlanSaveInput) => Promise<string | null>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    rooms: initialRooms.map(toDraft),
    past: [],
    selected: null,
    lastEdit: null,
  }));
  const [drag, setDrag] = useState<Drag | null>(null);
  const [drawing, setDrawing] = useState(initialRooms.length === 0);
  /** First corner of a "tap, tap" drawing (phones). */
  const [corner, setCorner] = useState<Point | null>(null);
  const [zoom, setZoom] = useState<(typeof ZOOMS)[number]>(1);
  const [pending, startTransition] = useTransition();
  const svgRef = useRef<SVGSVGElement>(null);
  const helpId = useId();

  const rooms = applyDrag(state.rooms, drag);
  const selected = rooms.find((r) => r.key === state.selected) ?? null;
  const selectedRect = selected ? polygonToRect(selected.points) : null;
  const drawnRect =
    drag?.kind === "draw" ? rectFromCorners(drag.start, drag.current) : null;
  const overlaps = overlapPairs(rooms);
  const overlapping = new Set(overlaps.flatMap(([a, b]) => [a.key, b.key]));

  const initialSignature = useMemo(
    () => JSON.stringify(toInput(initialRooms.map(toDraft))),
    [initialRooms],
  );
  const dirty = JSON.stringify(toInput(state.rooms)) !== initialSignature;
  // The rooms the broker took out: only these are deleted when saving.
  const removed = initialRooms
    .map((room) => room.id)
    .filter((id) => !state.rooms.some((room) => room.id === id));
  const plan: PlanSaveInput = { rooms: toInput(state.rooms), removed };
  // Same Zod rules as the server (name, area, overlaps), checked here first.
  const check = planSaveSchema.safeParse(plan);
  const problem = check.success ? null : check.error.issues[0];
  const problemIndex =
    problem && typeof problem.path[1] === "number" ? problem.path[1] : null;
  const invalidKey =
    problemIndex !== null ? state.rooms[problemIndex]?.key : null;
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

  function startDrag(event: React.PointerEvent, next: Drag) {
    event.preventDefault();
    event.stopPropagation();
    // preventDefault also stops the focus: give it back, so the arrows work
    // right after a click (without scrolling the page).
    svgRef.current?.focus({ preventScroll: true });
    svgRef.current?.setPointerCapture(event.pointerId);
    setDrag(next);
  }

  function onBackgroundDown(event: React.PointerEvent) {
    if (!drawing) {
      dispatch({ type: "select", key: null });
      return;
    }
    const point = toPlan(event);
    if (point) startDrag(event, { kind: "draw", start: point, current: point });
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
        dispatch({ type: "shape", key: drag.key, points: moved.points });
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
    setDrawing(false); // name it now; "Desenhar cômodo" again for the next
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      dispatch({ type: "undo" });
      return;
    }
    if (event.key === "Escape") {
      setDrawing(false);
      setCorner(null);
      dispatch({ type: "select", key: null });
      return;
    }
    if (!selected) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      dispatch({ type: "remove", key: selected.key });
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
      dispatch({
        type: "shape",
        key: selected.key,
        points: movePoints(selected.points, delta[0], delta[1]),
      });
    }
  }

  function save() {
    startTransition(async () => {
      try {
        const error = await onSave(plan);
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
    (drag && drag.kind !== "draw" && selectedRect ? selectedRect : null);

  return (
    <div className="flex flex-col gap-3" data-testid="plan-editor">
      <div
        role="toolbar"
        aria-label="Ferramentas da planta"
        className="flex flex-wrap items-center gap-2"
      >
        <Button
          size="sm"
          variant={drawing ? "default" : "outline"}
          aria-pressed={drawing}
          onClick={() => {
            setDrawing((d) => !d);
            setCorner(null);
          }}
        >
          {drawing ? <SquarePen aria-hidden /> : <MousePointer2 aria-hidden />}
          {drawing ? "Desenhando…" : "Desenhar cômodo"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!state.past.length}
          onClick={() => dispatch({ type: "undo" })}
        >
          <Undo2 aria-hidden />
          Desfazer
        </Button>
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
        {drawing
          ? corner
            ? "Agora toque no canto oposto (ou arraste para desenhar)."
            : "Arraste na grade para desenhar um cômodo, ou toque em dois cantos. Cada quadrado é 1 m."
          : "Toque num cômodo para escolher; arraste para mover e use as bolinhas para mudar o tamanho. No teclado: setas movem, Shift + setas mudam o tamanho."}
      </p>

      <div className="max-h-[70vh] overflow-auto rounded-lg border bg-card">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${vbWidth} ${vbHeight}`}
          style={{
            // At 100% the whole grid fits the box (by width AND by height).
            width: `min(${zoom * 100}%, ${((zoom * 68 * vbWidth) / vbHeight).toFixed(2)}vh)`,
            // Drawing: the finger draws. Choosing: an empty spot scrolls.
            touchAction: drawing ? "none" : "pan-x pan-y",
          }}
          className={cn(
            "mx-auto block outline-none focus-visible:ring-2 focus-visible:ring-ring",
            drawing && "cursor-crosshair",
          )}
          role="application"
          aria-label={`Planta com ${rooms.length} cômodos. ${selected ? `Selecionado: ${selected.name}.` : ""}`}
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
                className={drawing ? "" : "cursor-move"}
                onPointerDown={(event) => {
                  if (drawing) return; // let the background draw
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

          {/* Handles of the selected rectangle (bigger invisible touch area). */}
          {selectedRect &&
            !drawing &&
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

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={save}
          disabled={!dirty || pending || Boolean(problem)}
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
          onChange={(e) => {
            const type = e.target.value as RoomType;
            onEdit("type", type);
          }}
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
          {[2.4, 2.5, 2.6, 2.7, 2.8, 3, 3.5, 4, 5, 6].map((h) => (
            <option key={h} value={String(h)}>
              {formatDecimal(h)} m
            </option>
          ))}
          {![2.4, 2.5, 2.6, 2.7, 2.8, 3, 3.5, 4, 5, 6].includes(
            room.ceilingHeight,
          ) && (
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
