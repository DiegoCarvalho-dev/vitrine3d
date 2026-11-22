"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import { bounds } from "@/lib/planta/geometry";

import { type ModelPlan, type ModelRoom, UnitModel } from "./unit-model";

/**
 * 3D preview of a typology (issue #48): the walls and floors seen from above
 * at an angle, to compare with the 2D plan. Load with dynamic(ssr: false).
 */
export function UnitPreview({
  rooms,
  plan,
}: {
  rooms: readonly ModelRoom[];
  plan?: ModelPlan;
}) {
  const box = bounds(rooms.map((room) => room.points));
  const center: [number, number, number] = [
    (box.x0 + box.x1) / 2,
    0,
    -(box.y0 + box.y1) / 2,
  ];
  const size = Math.max(box.x1 - box.x0, box.y1 - box.y0, 4);

  return (
    <Canvas
      // The camera prop only applies on mount: a different plan size (a room
      // added or removed) mounts a fresh view, centered again.
      key={`${center.join()}|${size}`}
      frameloop="demand"
      dpr={[1, 2]}
      camera={{
        fov: 40,
        // In front of the plan (its bottom side), high up.
        position: [center[0], size * 1.9, center[2] + size * 0.9],
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
      <OrbitControls
        target={center}
        enablePan={false}
        minDistance={size * 0.6}
        maxDistance={size * 4}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </Canvas>
  );
}
