"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { MathUtils } from "three";

import { bounds } from "@/lib/planta/geometry";

import {
  type LabelRoom,
  LabelProjector,
  labelAnchors,
  RoomLabels,
} from "./room-labels";
import { type ModelPlan, type ModelRoom, UnitModel } from "./unit-model";

// Top view of the unit ("dollhouse", issue #50): walls without a ceiling,
// slightly tilted, a label per room. Drag to turn, pinch / wheel to zoom.
// Load with dynamic(ssr: false).

const TILT = MathUtils.degToRad(28); // from straight down

export type ViewerRoom = ModelRoom & LabelRoom;

export function UnitViewer({
  rooms,
  plan,
  selectedId,
  onSelectRoom,
}: {
  rooms: readonly ViewerRoom[];
  plan?: ModelPlan;
  selectedId: string | null;
  onSelectRoom: (id: string) => void;
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

  return (
    <div ref={frame} className="relative size-full">
      {aspect !== null && (
        <Canvas
          // The camera prop only applies on mount: a different plan mounts a
          // fresh view, framed again.
          key={`${center.join()}|${size}|${aspect}`}
          frameloop="demand"
          dpr={[1, 2]}
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
          <hemisphereLight args={["#f4f6fa", "#b9b5ad", 1.8]} />
          <directionalLight position={[6, 12, 8]} intensity={1.8} />
          <UnitModel rooms={rooms} plan={plan} />
          <LabelProjector
            anchors={anchors}
            labels={labels}
            selectedIndex={rooms.findIndex((room) => room.id === selectedId)}
          />
          <OrbitControls
            target={center}
            enablePan={false}
            enableDamping
            minDistance={size * 0.5}
            maxDistance={distance * 2}
            // From above down to a low angle; never under the floor.
            maxPolarAngle={MathUtils.degToRad(70)}
          />
        </Canvas>
      )}
      <RoomLabels
        rooms={rooms}
        selectedId={selectedId}
        onSelect={onSelectRoom}
        labels={labels}
      />
    </div>
  );
}
