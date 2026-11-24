"use client";

import { useEffect, useMemo } from "react";
import {
  BoxGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
} from "three";

import type { FurniturePiece } from "@/lib/planta/furniture";

// Furniture of the unit in 3D (issue #107): every box of every piece in ONE
// instanced mesh (one draw call, light on phones). Plan (x, y) and height z
// → 3D (x, z, -y), like the walls in unit-model.tsx.

export function Furniture({ pieces }: { pieces: readonly FurniturePiece[] }) {
  const mesh = useMemo(() => {
    const boxes = pieces.flatMap((piece) => piece.boxes);
    if (!boxes.length) return null;
    const instanced = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial({ roughness: 0.8 }),
      boxes.length,
    );
    const matrix = new Matrix4();
    const color = new Color();
    boxes.forEach((box, i) => {
      const width = box.x[1] - box.x[0];
      const depth = box.y[1] - box.y[0];
      const height = box.z[1] - box.z[0];
      matrix.makeScale(width, height, depth);
      matrix.setPosition(
        (box.x[0] + box.x[1]) / 2,
        (box.z[0] + box.z[1]) / 2,
        -(box.y[0] + box.y[1]) / 2,
      );
      instanced.setMatrixAt(i, matrix);
      instanced.setColorAt(i, color.set(box.color));
    });
    instanced.castShadow = true;
    instanced.receiveShadow = true;
    return instanced;
  }, [pieces]);

  useEffect(
    () => () => {
      mesh?.geometry.dispose();
      (mesh?.material as MeshStandardMaterial | undefined)?.dispose();
      mesh?.dispose();
    },
    [mesh],
  );

  return mesh ? <primitive object={mesh} /> : null;
}
