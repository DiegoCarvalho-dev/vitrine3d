"use client";

import { useEffect, useRef } from "react";

import type { WalkInput } from "./walk-controls";

const RADIUS = 44; // px the knob can travel

/** Moves the knob (DOM write outside React: it follows the finger). */
function placeKnob(knob: HTMLElement | null, dx: number, dy: number) {
  if (knob)
    knob.style.transform = dx || dy ? `translate(${dx}px, ${dy}px)` : "";
}

/** Virtual joystick for phones (issue #51): drag the knob to walk. */
export function WalkJoystick({ input }: { input: WalkInput }) {
  const knob = useRef<HTMLSpanElement>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  // Leaving the walk mode while holding it: stop.
  useEffect(() => () => input.setMove(0, 0), [input]);

  const moveTo = (x: number, y: number) => {
    const from = origin.current;
    if (!from) return;
    const rawX = x - from.x;
    const rawY = y - from.y;
    const scale = Math.min(1, RADIUS / (Math.hypot(rawX, rawY) || 1));
    const dx = rawX * scale;
    const dy = rawY * scale;
    input.setMove(dx / RADIUS, -dy / RADIUS); // up on screen = forward
    placeKnob(knob.current, dx, dy);
  };

  const release = () => {
    origin.current = null;
    input.setMove(0, 0);
    placeKnob(knob.current, 0, 0);
  };

  return (
    <div
      aria-hidden // touch-only control; the keyboard uses W A S D / arrows
      data-testid="walk-joystick"
      className="absolute bottom-4 left-4 z-30 flex size-28 touch-none items-center justify-center rounded-full bg-black/25 select-none"
      onPointerDown={(event) => {
        event.stopPropagation(); // not a drag-to-look
        event.currentTarget.setPointerCapture(event.pointerId);
        const box = event.currentTarget.getBoundingClientRect();
        origin.current = {
          x: box.left + box.width / 2,
          y: box.top + box.height / 2,
        };
        moveTo(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        event.stopPropagation();
        moveTo(event.clientX, event.clientY);
      }}
      // Not the frame's: a finger dragging to look keeps going.
      onPointerUp={(event) => {
        event.stopPropagation();
        release();
      }}
      onPointerCancel={(event) => {
        event.stopPropagation();
        release();
      }}
    >
      <span ref={knob} className="size-12 rounded-full bg-white/90 shadow-md" />
    </div>
  );
}
