"use client";

import { useSyncExternalStore } from "react";

/** Does this browser give us a WebGL context? (checked once, in the browser) */
let webglSupport: boolean | undefined;
function hasWebGL(): boolean {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = Boolean(
        canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
      );
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noop = () => () => {};

/**
 * null on the server (no document); true/false in the browser. A <canvas>
 * may exist without WebGL (old phone, disabled GPU), and then the Canvas
 * fallback never shows, so pages check this first.
 */
export function useWebGL(): boolean | null {
  return useSyncExternalStore(noop, hasWebGL, () => null);
}
