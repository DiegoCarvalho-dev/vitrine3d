"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MathUtils, type Vector3 } from "three";

import { blockingSegments, startPoint } from "@/lib/planta/collision";
import { bounds } from "@/lib/planta/geometry";
import { walkGrid } from "@/lib/planta/path";

import { AdaptiveQuality } from "./adaptive-quality";

import {
  type LabelRoom,
  LabelProjector,
  labelAnchors,
  RoomLabels,
} from "./room-labels";
import { type ModelPlan, type ModelRoom, UnitModel } from "./unit-model";
import { WalkControls, WalkInput } from "./walk-controls";
import { WalkJoystick } from "./walk-joystick";

// The unit in 3D. "top" (issue #50): the "dollhouse", walls without a
// ceiling, slightly tilted, a label per room; drag to turn, pinch / wheel to
// zoom. "walk" (issue #51): inside, at eye height. Load with
// dynamic(ssr: false).

export type ViewMode = "top" | "walk";

const TILT = MathUtils.degToRad(28); // from straight down

export type ViewerRoom = ModelRoom & LabelRoom;

type Touch = {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  at: number;
};

/** The look-drag ends only when ITS finger lifts. */
function endLook(last: { current: Touch | null }, pointerId: number) {
  if (last.current?.id === pointerId) last.current = null;
}

/** A quick touch that didn't move: a tap (walk there), not a look-drag. */
function isTap(touch: Touch, x: number, y: number, now: number) {
  return (
    Math.hypot(x - touch.startX, y - touch.startY) < 10 && now - touch.at < 400
  );
}

type ControlsLike = { target: Vector3; update: () => void };

/** The frame changed shape (phone turned, window resized): frame again. */
function Reframe({
  center,
  distance,
}: {
  center: [number, number, number];
  distance: number;
}) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as ControlsLike | null;
  const invalidate = useThree((state) => state.invalidate);
  const framed = useRef(distance);
  const [x, , z] = center;
  useEffect(() => {
    if (framed.current === distance) return; // the camera prop framed it
    framed.current = distance;
    camera.position.set(
      x,
      distance * Math.cos(TILT),
      z + distance * Math.sin(TILT),
    );
    controls?.target.set(x, 0, z);
    controls?.update();
    invalidate();
  }, [camera, controls, distance, x, z, invalidate]);
  return null;
}

export function UnitViewer({
  rooms,
  plan,
  selectedId,
  onSelectRoom,
  mode = "top",
  onWalk,
}: {
  rooms: readonly ViewerRoom[];
  plan?: ModelPlan;
  selectedId: string | null;
  onSelectRoom: (id: string) => void;
  mode?: ViewMode;
  /** The visitor took the first real step inside (once per walk). */
  onWalk?: () => void;
}) {
  const box = bounds(rooms.map((room) => room.points));
  const center: [number, number, number] = [
    (box.x0 + box.x1) / 2,
    0,
    -(box.y0 + box.y1) / 2,
  ];
  const width = Math.max(box.x1 - box.x0, 3);
  const depth = Math.max(box.y1 - box.y0, 3);
  const size = Math.max(width, depth);

  // The frame's shape (portrait phone or wide desktop) decides how far the
  // camera goes: measured before the 3D opens, again when it changes a lot
  // (phone turned).
  const frame = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => {
      const { clientWidth: w, clientHeight: h } = element;
      if (w && h) setAspect(Math.round((w / h) * 10) / 10);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const FOV = 40;
  const vertical = MathUtils.degToRad(FOV);
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * (aspect ?? 1));
  // The sphere around the whole unit (walls included) fits the narrower
  // angle of view: works for a portrait phone and a wide desktop alike.
  const tallest = Math.max(...rooms.map((room) => room.height), 2.7);
  const radius = 0.5 * Math.hypot(width, depth, tallest);
  const distance =
    (radius / Math.sin(Math.min(vertical, horizontal) / 2)) * 1.05;
  const anchors = useMemo(() => labelAnchors(rooms), [rooms]);
  const labels = useRef<(HTMLElement | null)[]>([]);

  // Walk mode: the walls that block, where it starts, and the touch input.
  const walls = useMemo(() => blockingSegments(rooms, plan), [rooms, plan]);
  const start = useMemo(() => startPoint(rooms, plan), [rooms, plan]);
  // Where the body fits, for "tap on the floor to walk there" (#108).
  // Built only in the walk mode (the top view doesn't need it).
  const grid = useMemo(
    () =>
      mode === "walk"
        ? walkGrid(walls, {
            x0: box.x0 - 0.2,
            y0: box.y0 - 0.2,
            x1: box.x1 + 0.2,
            y1: box.y1 + 0.2,
          })
        : null,
    [mode, walls, box.x0, box.y0, box.x1, box.y1],
  );
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  // The joystick is optional now (tapping walks): hidden behind a button.
  const [joystick, setJoystick] = useState(false);
  const [walkInput] = useState(() => new WalkInput());
  const isTouch = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches,
    [],
  );
  const lastTouch = useRef<Touch | null>(null);
  const walking = mode === "walk";
  // Lowered by AdaptiveQuality on a slow phone (kept across re-renders).
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);
  useEffect(() => {
    if (walking) frame.current?.focus({ preventScroll: true });
    else frame.current?.removeAttribute("data-walk-ready");
  }, [walking]);
  const markWalkReady = useCallback(
    () => frame.current?.setAttribute("data-walk-ready", "true"),
    [],
  );

  return (
    <div
      ref={frame}
      className={`relative size-full ${walking ? "touch-none" : ""}`}
      data-mode={mode}
      // Phone, walk mode: dragging on the 3D looks around.
      onPointerDown={(event) => {
        // Finger or stylus (a mouse looks with the pointer lock instead).
        if (!walking || event.pointerType === "mouse") return;
        if (lastTouch.current) return; // one finger looks; others are ignored
        lastTouch.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          startX: event.clientX,
          startY: event.clientY,
          at: event.timeStamp,
        };
      }}
      onPointerMove={(event) => {
        const last = lastTouch.current;
        if (!walking || !last || last.id !== event.pointerId) return;
        // Grabbing the scene: dragging right turns the view left.
        walkInput.addLook(last.x - event.clientX, last.y - event.clientY);
        lastTouch.current = { ...last, x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        const touch = lastTouch.current;
        if (
          walking &&
          touch?.id === event.pointerId &&
          isTap(touch, event.clientX, event.clientY, event.timeStamp)
        ) {
          // Screen spot -> -1..1 (y up), for the floor under the finger.
          event.currentTarget.removeAttribute("data-walk-at");
          const area = event.currentTarget.getBoundingClientRect();
          walkInput.tap(
            ((event.clientX - area.left) / area.width) * 2 - 1,
            -(((event.clientY - area.top) / area.height) * 2 - 1),
          );
        }
        endLook(lastTouch, event.pointerId);
      }}
      onPointerCancel={(event) => endLook(lastTouch, event.pointerId)}
      // Focusable, so the walk keys work only while it has the focus.
      tabIndex={walking ? -1 : undefined}
    >
      {aspect !== null && (
        <Canvas
          // The camera prop only applies on mount: a different plan mounts a
          // fresh view, framed again.
          key={`${center.join()}|${size}|${mode}`}
          // Walking draws continuously; the top view only when it changes.
          frameloop={walking ? "always" : "demand"}
          dpr={dpr}
          camera={{
            fov: FOV,
            position: [
              center[0],
              distance * Math.cos(TILT),
              center[2] + distance * Math.sin(TILT),
            ],
          }}
          fallback={
            <p className="p-4 text-sm text-muted-foreground">
              Seu navegador não conseguiu abrir o 3D (WebGL indisponível).
            </p>
          }
        >
          <color attach="background" args={["#f2f1ee"]} />
          {walking && <AdaptiveQuality onChange={setDpr} />}
          <hemisphereLight args={["#f4f6fa", "#b9b5ad", 1.8]} />
          <directionalLight position={[6, 12, 8]} intensity={1.8} />
          <UnitModel rooms={rooms} plan={plan} showCeiling={walking} />
          {walking && grid ? (
            <WalkControls
              walls={walls}
              grid={grid}
              start={start}
              input={walkInput}
              keyTarget={frame}
              reducedMotion={reducedMotion}
              onMove={onWalk}
              // The 3D canvas shows up before the walk inside it listens:
              // this marks the moment it does (read by the e2e tests).
              onReady={markWalkReady}
              // Where a tap-to-walk ended (read by the e2e tests).
              onArrive={(at) =>
                frame.current?.setAttribute(
                  "data-walk-at",
                  at.map((n) => n.toFixed(2)).join(","),
                )
              }
            />
          ) : (
            <>
              <LabelProjector
                anchors={anchors}
                labels={labels}
                selectedIndex={rooms.findIndex(
                  (room) => room.id === selectedId,
                )}
              />
              <Reframe center={center} distance={distance} />
              <OrbitControls
                makeDefault
                target={center}
                enablePan={false}
                enableDamping
                minDistance={size * 0.5}
                maxDistance={distance * 2}
                // From above down to a low angle; never under the floor.
                maxPolarAngle={MathUtils.degToRad(70)}
              />
            </>
          )}
        </Canvas>
      )}
      {walking ? (
        <>
          {isTouch && joystick && <WalkJoystick input={walkInput} />}
          {isTouch && (
            <button
              type="button"
              aria-pressed={joystick}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                walkInput.setMove(0, 0);
                setJoystick((on) => !on);
              }}
              className="absolute top-3 right-3 z-30 rounded-md bg-black/55 px-3 py-2 text-xs font-medium text-white"
            >
              {joystick ? "Esconder controle" : "Controle"}
            </button>
          )}
          <p
            className={`pointer-events-none absolute right-3 bottom-3 z-30 rounded-md bg-black/55 px-2.5 py-1.5 text-xs text-white sm:left-auto sm:max-w-sm ${joystick ? "left-36" : "left-3"}`}
          >
            {isTouch
              ? joystick
                ? "Use o controle para andar e arraste a imagem para olhar."
                : "Toque no chão para andar até lá. Arraste a imagem para olhar."
              : "Clique na imagem para olhar com o mouse. Ande com W A S D ou as setas, ou clique de novo para ir até o chão logo abaixo do centro. Esc solta o mouse."}
          </p>
        </>
      ) : (
        <RoomLabels
          rooms={rooms}
          selectedId={selectedId}
          onSelect={onSelectRoom}
          labels={labels}
        />
      )}
    </div>
  );
}
