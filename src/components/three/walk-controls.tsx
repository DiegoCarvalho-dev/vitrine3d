"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";
import {
  type Camera,
  type Mesh,
  type PerspectiveCamera,
  Plane,
  type PointLight,
  Raycaster,
  Vector2,
  Vector3,
} from "three";

import { EYE_HEIGHT, type Segment, step } from "@/lib/planta/collision";
import { findPath, type WalkGrid } from "@/lib/planta/path";
import type { Point } from "@/lib/validacoes/planta";

// Walking inside the unit at eye height (issues #51 and #108). Phone: tap
// on the floor to glide there (around walls and furniture), drag to look;
// the joystick is optional. Desktop: W A S D or the arrows to walk, the
// mouse to look (pointer lock, after a click); a click while looking walks
// to the floor spot at the center. Moderate speed and no head bobbing, so
// nobody gets dizzy.

const SPEED = 1.3; // m/s, a calm walk
const GLIDE = 1.8; // m/s, going to a tapped spot
const FLOOR = new Plane(new Vector3(0, 1, 0), 0);
const RAY = new Raycaster();
const NDC = new Vector2();
const HIT = new Vector3();
const LOOK_SPEED = 0.0025; // radians per pixel
const MAX_PITCH = 1.2; // ~70° up or down

/**
 * Input shared between the DOM (joystick, drag, keys, mouse) and the 3D
 * loop. A plain mutable object on purpose: it changes many times a second
 * and must not re-render React.
 */
export class WalkInput {
  private moveX = 0;
  private moveY = 0;
  private lookX = 0;
  private lookY = 0;
  private keys = new Set<string>();
  private pendingTap: [number, number] | null = null;

  /** A tap on the 3D, in screen coordinates -1..1 (x right, y up). */
  tap(x: number, y: number) {
    this.pendingTap = [x, y];
  }

  /** The tap since the last frame (then none). */
  takeTap(): [number, number] | null {
    const tap = this.pendingTap;
    this.pendingTap = null;
    return tap;
  }

  /** Joystick: x = right, y = forward, each -1..1. */
  setMove(x: number, y: number) {
    this.moveX = x;
    this.moveY = y;
  }

  /** Pixels to turn the view (mouse or drag). */
  addLook(dx: number, dy: number) {
    this.lookX += dx;
    this.lookY += dy;
  }

  press(code: string) {
    this.keys.add(code);
  }

  release(code?: string) {
    if (code) this.keys.delete(code);
    else this.keys.clear();
  }

  /** Everything back to rest (leaving the walk mode). */
  reset() {
    this.setMove(0, 0);
    this.takeLook();
    this.takeTap();
    this.release();
  }

  /** The look since the last frame (then zero). */
  takeLook(): [number, number] {
    const look: [number, number] = [this.lookX, this.lookY];
    this.lookX = 0;
    this.lookY = 0;
    return look;
  }

  /** Forward and right amounts (-1..1) from the joystick plus the keys. */
  direction(): [number, number] {
    const has = (codes: readonly string[]) =>
      codes.some((code) => this.keys.has(code));
    const forward =
      this.moveY + (has(KEYS.forward) ? 1 : 0) - (has(KEYS.back) ? 1 : 0);
    const right =
      this.moveX + (has(KEYS.right) ? 1 : 0) - (has(KEYS.left) ? 1 : 0);
    const amount = Math.hypot(forward, right);
    return amount > 1 ? [forward / amount, right / amount] : [forward, right];
  }
}

export const KEYS = {
  forward: ["KeyW", "ArrowUp"],
  back: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
} as const;
const ALL_KEYS: readonly string[] = Object.values(KEYS).flat();

/** Eye-level camera: wider angle, close near plane, yaw before pitch. */
function setupEyeCamera(camera: PerspectiveCamera) {
  camera.rotation.order = "YXZ";
  camera.fov = 70;
  camera.near = 0.05;
  camera.updateProjectionMatrix();
}

function placeCamera(
  camera: Camera,
  light: PointLight | null,
  [x, y]: Point,
  yaw: number,
  pitch: number,
) {
  camera.position.set(x, EYE_HEIGHT, -y); // plan y → 3D -z
  camera.rotation.set(pitch, yaw, 0);
  // A soft light just above the head: near walls brighter, far ones darker,
  // so the rooms read with depth.
  light?.position.set(x, EYE_HEIGHT + 0.6, -y);
}

export function WalkControls({
  walls,
  grid,
  start,
  input,
  keyTarget,
  reducedMotion = false,
  onArrive,
}: {
  walls: readonly Segment[];
  /** Where the body fits, for tap-to-walk (built once per plan). */
  grid: WalkGrid;
  start: { at: Point; facing: Point };
  input: WalkInput;
  /** Keys only count while the focus is in here (or the mouse is locked). */
  keyTarget: RefObject<HTMLElement | null>;
  /** "Reduce motion": a tap jumps there instead of gliding. */
  reducedMotion?: boolean;
  /** Called once when a tap-to-walk arrives (plan meters). */
  onArrive?: (at: Point) => void;
}) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const canvas = useThree((state) => state.gl.domElement);
  const position = useRef<Point>(start.at);
  // Yaw 0 looks along the plan's +y; the facing direction sets the start.
  const yaw = useRef(Math.atan2(-start.facing[0], start.facing[1]));
  const pitch = useRef(0);
  const light = useRef<PointLight>(null);
  /** Points still to walk through after a tap (empty: none). */
  const route = useRef<Point[]>([]);
  const marker = useRef<Mesh>(null);

  useLayoutEffect(() => setupEyeCamera(camera), [camera]);

  // Keyboard (not while typing in a field).
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      // Shortcuts (Cmd/Ctrl+A...) are the browser's; on a Mac the letter
      // would never get its keyup and keep walking.
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!ALL_KEYS.includes(event.code)) return;
      const focused = keyTarget.current?.contains(document.activeElement);
      if (!focused && document.pointerLockElement !== canvas) return;
      event.preventDefault(); // the arrows would scroll the page
      input.press(event.code);
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === "Meta") input.release();
      else input.release(event.code);
    };
    const clear = () => input.release();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      input.reset(); // leaving: nothing keeps walking next time
    };
  }, [input, keyTarget, canvas]);

  // Mouse: a click on the 3D locks the pointer; moving it looks around.
  useEffect(() => {
    const lock = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      // Already looking with the mouse: the click walks to the center spot.
      if (document.pointerLockElement === canvas) {
        input.tap(0, 0);
        return;
      }
      // Chrome refuses (and rejects the promise) right after Esc.
      Promise.resolve(canvas.requestPointerLock?.()).catch(() => {});
    };
    const move = (event: MouseEvent) => {
      if (document.pointerLockElement === canvas)
        input.addLook(event.movementX, event.movementY);
    };
    canvas.addEventListener("pointerdown", lock);
    document.addEventListener("mousemove", move);
    return () => {
      canvas.removeEventListener("pointerdown", lock);
      document.removeEventListener("mousemove", move);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    };
  }, [canvas, input]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1); // a hiccup never jumps a wall
    const [lookX, lookY] = input.takeLook();
    yaw.current -= lookX * LOOK_SPEED;
    pitch.current = Math.max(
      -MAX_PITCH,
      Math.min(MAX_PITCH, pitch.current - lookY * LOOK_SPEED),
    );

    // A tap: the floor spot under it (looking up at the ceiling: nothing).
    const tap = input.takeTap();
    if (tap) {
      RAY.setFromCamera(NDC.set(tap[0], tap[1]), camera);
      if (RAY.ray.intersectPlane(FLOOR, HIT)) {
        const target: Point = [HIT.x, -HIT.z];
        route.current = findPath(grid, walls, position.current, target);
        if (reducedMotion && route.current.length) {
          position.current = route.current.at(-1)!;
          route.current = [];
          onArrive?.(position.current);
        }
      }
    }

    const [forward, right] = input.direction();
    const manual = Math.hypot(forward, right) > 0.01;
    if (manual) route.current = []; // the joystick or keys take over
    if (!manual && route.current.length) {
      // Glide to the next point of the way.
      const [tx, ty] = route.current[0];
      const [x, y] = position.current;
      const left = Math.hypot(tx - x, ty - y);
      const stride = GLIDE * delta;
      if (left <= stride) {
        position.current = [tx, ty];
        route.current = route.current.slice(1);
        if (!route.current.length) onArrive?.(position.current);
      } else {
        position.current = [
          x + ((tx - x) / left) * stride,
          y + ((ty - y) / left) * stride,
        ];
      }
    }
    // The ring on the floor shows where the walk goes.
    const goal = route.current.at(-1);
    if (marker.current) {
      marker.current.visible = Boolean(goal);
      if (goal) marker.current.position.set(goal[0], 0.02, -goal[1]);
    }

    if (manual) {
      const sin = Math.sin(yaw.current);
      const cos = Math.cos(yaw.current);
      // Plan directions: forward (-sin, cos), right (cos, sin).
      const dx = (-sin * forward + cos * right) * SPEED * delta;
      const dy = (cos * forward + sin * right) * SPEED * delta;
      position.current = step(position.current, [dx, dy], walls);
    }
    placeCamera(
      camera,
      light.current,
      position.current,
      yaw.current,
      pitch.current,
    );
  });

  return (
    <>
      <pointLight ref={light} intensity={5} decay={1.4} color="#fff3e2" />
      <mesh ref={marker} rotation-x={-Math.PI / 2} visible={false}>
        <ringGeometry args={[0.16, 0.24, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </mesh>
    </>
  );
}
