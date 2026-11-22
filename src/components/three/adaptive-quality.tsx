"use client";

import { PerformanceMonitor } from "@react-three/drei";

/**
 * Automatic quality (issue #53): when the frame rate drops (a slow phone),
 * the 3D draws at 1x the screen density instead of up to `max`, about half
 * the pixels; when it recovers, the sharpness comes back. Goes inside a
 * <Canvas> that draws continuously (frameloop "always"): with "demand",
 * the pauses between interactions would look like a low frame rate.
 *
 * The density lives in React state on the Canvas (`dpr={dpr}`), so a
 * re-render of the page doesn't reset it.
 */
export function AdaptiveQuality({
  onChange,
  max = 2,
}: {
  onChange: (dpr: [number, number]) => void;
  max?: number;
}) {
  return (
    <PerformanceMonitor
      onDecline={() => onChange([1, 1])}
      onIncline={() => onChange([1, max])}
      // Going up and down too often: stay at the lighter setting.
      flipflops={3}
      onFallback={() => onChange([1, 1])}
    />
  );
}
