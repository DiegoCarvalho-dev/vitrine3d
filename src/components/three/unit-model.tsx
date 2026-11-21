"use client";

import { useEffect, useMemo } from "react";
import {
  BackSide,
  BoxGeometry,
  type BufferGeometry,
  Color,
  Float32BufferAttribute,
  Shape,
  ShapeGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { RoomType } from "@/lib/validacoes/comodo";
import type { Point } from "@/lib/validacoes/planta";
import { buildWalls, WALL_THICKNESS, wallLength } from "@/lib/planta/walls";

// The apartment in 3D (issue #48): a floor per room (color by room type) and
// walls along the room edges, shared walls only once. Everything merged into
// 2–3 meshes, built once per set of rooms. Plan (x, y) → 3D (x, 0, -y): the
// plan's "up" points away from the camera, like looking at the 2D preview.

export type ModelRoom = {
  id: string;
  type: RoomType;
  points: readonly Point[];
  height: number;
};

const FLOOR_COLOR: Record<RoomType, string> = {
  sala: "#c9a77c", // wood
  quarto: "#c9a77c",
  suite: "#c9a77c",
  outro: "#c9a77c",
  cozinha: "#d9d6cf", // tile
  banheiro: "#cfd8dc",
  lavanderia: "#d9d6cf",
  varanda: "#b98b6e", // terracotta
};
const WALL_COLOR = "#f4f1ec";

function paint(geometry: BufferGeometry, hex: string) {
  const color = new Color(hex);
  const count = geometry.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) color.toArray(colors, i * 3);
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geometry;
}

function roomShape(points: readonly Point[]) {
  const shape = new Shape();
  points.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  return shape;
}

/** Floor of one room, lying flat at `elevation` (plan y → -z). */
function flatShape(points: readonly Point[], elevation: number) {
  const geometry = new ShapeGeometry(roomShape(points));
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, elevation, 0);
  return geometry;
}

/** Builds the merged geometries (pure: easy to reuse in other views). */
export function buildUnitGeometry(
  rooms: readonly ModelRoom[],
  { ceiling = false }: { ceiling?: boolean } = {},
) {
  const floors = rooms.map((room) =>
    paint(flatShape(room.points, 0), FLOOR_COLOR[room.type]),
  );
  // Built only when asked for (it's hidden in most views).
  const ceilings = ceiling
    ? rooms.map((room) => flatShape(room.points, room.height))
    : [];
  const walls = buildWalls(rooms).map((wall) => {
    const [ax, ay] = wall.a;
    const [bx, by] = wall.b;
    // A bit longer than the segment, so the corners close.
    const box = new BoxGeometry(
      wallLength(wall) + WALL_THICKNESS,
      wall.height,
      WALL_THICKNESS,
    );
    box.rotateY(Math.atan2(by - ay, bx - ax));
    box.translate((ax + bx) / 2, wall.height / 2, -(ay + by) / 2);
    return paint(box, WALL_COLOR);
  });
  const merge = (parts: BufferGeometry[]) => {
    if (!parts.length) return null;
    const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g));
    const merged = mergeGeometries(flat);
    for (const part of parts) part.dispose();
    return merged;
  };
  return {
    floor: merge(floors),
    walls: merge(walls),
    ceiling: merge(ceilings),
  };
}

export function UnitModel({
  rooms,
  showCeiling = false,
}: {
  rooms: readonly ModelRoom[];
  /** Hidden in the top view; from below it's seen only from inside anyway. */
  showCeiling?: boolean;
}) {
  const geometry = useMemo(
    () => buildUnitGeometry(rooms, { ceiling: showCeiling }),
    [rooms, showCeiling],
  );
  useEffect(
    () => () => {
      geometry.floor?.dispose();
      geometry.walls?.dispose();
      geometry.ceiling?.dispose();
    },
    [geometry],
  );

  return (
    <group>
      {geometry.floor && (
        <mesh geometry={geometry.floor} receiveShadow>
          <meshStandardMaterial vertexColors roughness={0.85} />
        </mesh>
      )}
      {geometry.walls && (
        <mesh geometry={geometry.walls} castShadow receiveShadow>
          <meshStandardMaterial vertexColors roughness={0.9} />
        </mesh>
      )}
      {showCeiling && geometry.ceiling && (
        // Faces up, drawn from behind: visible from inside the room only.
        <mesh geometry={geometry.ceiling}>
          <meshStandardMaterial color="#ffffff" side={BackSide} />
        </mesh>
      )}
    </group>
  );
}
