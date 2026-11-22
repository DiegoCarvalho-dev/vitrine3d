"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";
import type { Camera, PerspectiveCamera, PointLight } from "three";

import { EYE_HEIGHT, type Segment, step } from "@/lib/planta/collision";
import type { Point } from "@/lib/validacoes/planta";

// Walking inside the unit at eye height (issue #51). Desktop: W A S D or the
// arrows to walk, the mouse to look (pointer lock, after a click). Phone: the
// joystick to walk, dragging to look. Moderate speed and no head bobbing, so
// nobody gets dizzy.

const SPEED = 1.3; // m/s, a calm walk
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
  start,
  input,
  keyTarget,
}: {
  walls: readonly Segment[];
  start: { at: Point; facing: Point };
  input: WalkInput;
  /** Keys only count while the focus is in here (or the mouse is locked). */
  keyTarget: RefObject<HTMLElement | null>;
}) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const canvas = useThree((state) => state.gl.domElement);
  const position = useRef<Point>(start.at);
  // Yaw 0 looks along the plan's +y; the facing direction sets the start.
  const yaw = useRef(Math.atan2(-start.facing[0], start.facing[1]));
  const pitch = useRef(0);
  const light = useRef<PointLight>(null);

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

    const [forward, right] = input.direction();
    if (Math.hypot(forward, right) > 0.01) {
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

  return <pointLight ref={light} intensity={5} decay={1.4} color="#fff3e2" />;
}
