"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { type RefObject, useEffect, useMemo } from "react";
import { Vector3 } from "three";

import { bounds, labelPoint } from "@/lib/planta/geometry";
import { formatDecimal } from "@/lib/validacoes/numero";
import type { Point } from "@/lib/validacoes/planta";

export type LabelRoom = {
  id: string;
  name: string;
  area: number;
  points: readonly Point[];
  height: number;
};

/** Where each label goes (3D) and how wide its room is at that height. */
export function labelAnchors(rooms: readonly LabelRoom[]) {
  return rooms.map((room) => {
    const [x, y] = labelPoint(room.points);
    const box = bounds([room.points]);
    return {
      center: new Vector3(x, 0.05, -y), // plan y → 3D -z
      // Corners of the room box: its width on screen, whatever the angle.
      corners: [
        [box.x0, box.y0],
        [box.x1, box.y0],
        [box.x1, box.y1],
        [box.x0, box.y1],
      ].map(([cx, cy]) => new Vector3(cx, 0.05, -cy)),
      area: room.area,
    };
  });
}

type Anchor = ReturnType<typeof labelAnchors>[number];

/** DOM writes for a label, outside React (it moves on every frame). */
function styleLabel(
  element: HTMLElement,
  style: Partial<
    Pick<CSSStyleDeclaration, "transform" | "visibility" | "maxWidth">
  >,
) {
  Object.assign(element.style, style);
}

/** Shows or hides the "20 m²" line of a label. */
function showDetail(element: HTMLElement, show: boolean) {
  const detail = element.querySelector<HTMLElement>("[data-area]");
  if (detail) detail.style.display = show ? "" : "none";
}
/** Label size for a max width and mode, measured once and cached. */
function measure(
  cache: Map<string, { w: number; h: number }>,
  element: HTMLElement,
  key: string,
) {
  let size = cache.get(key);
  if (!size) {
    size = { w: element.offsetWidth, h: element.offsetHeight };
    cache.set(key, size);
  }
  return size;
}

type Box = { x0: number; y0: number; x1: number; y1: number };
const GAP = 2; // px between labels
const overlaps = (a: Box, b: Box) =>
  a.x0 < b.x1 + GAP &&
  b.x0 < a.x1 + GAP &&
  a.y0 < b.y1 + GAP &&
  b.y0 < a.y1 + GAP;

/**
 * Inside the <Canvas>: on every drawn frame, moves each label (a DOM button
 * over the 3D) to its room on screen, no wider than the room. Bigger rooms
 * (and the selected one) go first; a label that would cover another shows
 * only the name, and if it still doesn't fit it hides (the room list under
 * the 3D still has it). Writes the style directly: turning the view doesn't
 * re-render React.
 */
export function LabelProjector({
  anchors,
  labels,
  selectedIndex,
}: {
  anchors: Anchor[];
  labels: RefObject<(HTMLElement | null)[]>;
  selectedIndex: number;
}) {
  const point = useMemo(() => new Vector3(), []);
  const order = useMemo(
    () =>
      anchors
        .map((anchor, i) => ({ i, area: anchor.area }))
        .sort(
          (a, b) =>
            Number(b.i === selectedIndex) - Number(a.i === selectedIndex) ||
            b.area - a.area,
        )
        .map(({ i }) => i),
    [anchors, selectedIndex],
  );
  // Sizes by (label, max width, mode): the DOM is measured only on a miss,
  // not on every frame while the view turns. A new selection changes how
  // the labels look, so they are measured again.
  const sizes = useMemo(
    () => new Map<string, { w: number; h: number }>(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anchors, selectedIndex],
  );
  const invalidate = useThree((state) => state.invalidate);
  // A new selection changes the order: lay the labels out again.
  useEffect(() => invalidate(), [order, invalidate]);

  useFrame(({ camera, size }) => {
    // The renderer updates this only while drawing; the controls may have
    // just moved the camera.
    camera.updateMatrixWorld();
    const toScreen = (v: Vector3) => {
      point.copy(v).project(camera);
      return {
        x: ((point.x + 1) / 2) * size.width,
        y: ((1 - point.y) / 2) * size.height,
        visible: point.z < 1,
      };
    };
    const placed: Box[] = [];
    for (const i of order) {
      const element = labels.current[i];
      if (!element) continue;
      const anchor = anchors[i];
      const at = toScreen(anchor.center);
      if (!at.visible) {
        styleLabel(element, { visibility: "hidden" });
        continue;
      }
      const xs = anchor.corners.map((corner) => toScreen(corner).x);
      const roomWidth = Math.max(...xs) - Math.min(...xs);
      // In steps of 8 px, so the cache gets hits while zooming.
      const maxWidth =
        Math.round(Math.max(64, Math.min(112, roomWidth - 6)) / 8) * 8;
      styleLabel(element, { maxWidth: `${maxWidth}px` });
      const boxOf = (mode: "full" | "name"): Box => {
        const { w, h } = measure(sizes, element, `${i}|${maxWidth}|${mode}`);
        return {
          x0: at.x - w / 2,
          y0: at.y - h / 2,
          x1: at.x + w / 2,
          y1: at.y + h / 2,
        };
      };
      showDetail(element, true);
      let box = boxOf("full");
      if (placed.some((other) => overlaps(box, other))) {
        showDetail(element, false); // name only
        box = boxOf("name");
      }
      const fits = !placed.some((other) => overlaps(box, other));
      styleLabel(element, {
        transform: `translate(${at.x}px, ${at.y}px) translate(-50%, -50%)`,
        visibility: fits ? "visible" : "hidden",
      });
      if (fits) placed.push(box);
    }
  });
  return null;
}

/**
 * Name and area of each room over the 3D (issue #50). Real buttons: readable
 * at any zoom, reachable by keyboard and screen readers. LabelProjector
 * places them without covering each other.
 */
export function RoomLabels({
  rooms,
  selectedId,
  onSelect,
  labels,
}: {
  rooms: readonly LabelRoom[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  labels: RefObject<(HTMLElement | null)[]>;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {rooms.map((room, i) => {
        const isSelected = room.id === selectedId;
        return (
          <button
            key={room.id}
            ref={(element) => {
              labels.current[i] = element;
            }}
            type="button"
            onClick={() => onSelect(room.id)}
            // A shortcut for mouse and touch. Keyboard and screen readers use
            // the room list under the 3D (same action): not read twice.
            aria-hidden
            tabIndex={-1}
            data-testid="room-label"
            // Starts hidden until the first frame places it.
            style={{ visibility: "hidden" }}
            className={`pointer-events-auto absolute top-0 left-0 cursor-pointer rounded-md px-1.5 py-0.5 text-center text-[11px] leading-tight shadow-sm ring-1 select-none ${
              isSelected
                ? "bg-foreground text-background ring-transparent"
                : "bg-white/95 text-foreground ring-black/10 hover:bg-white"
            }`}
          >
            <span className="block truncate font-medium">{room.name}</span>
            <span data-area className="block tabular-nums opacity-75">
              {formatDecimal(room.area)} m²
            </span>
          </button>
        );
      })}
    </div>
  );
}
