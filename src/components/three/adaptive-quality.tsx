"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

/**
 * Automatic quality (issue #53): when the frame rate drops (a slow phone),
 * the 3D draws at 1× the screen density instead of up to 2×, about half
 * the pixels; when it recovers, the sharpness comes back. Goes inside a
 * <Canvas>.
 */
export function AdaptiveQuality() {
  const setDpr = useThree((state) => state.setDpr);
  return (
    <PerformanceMonitor
      onDecline={() => setDpr(1)}
      onIncline={() => setDpr([1, 2])}
      // Going up and down too often: stay at the lighter setting.
      flipflops={3}
      onFallback={() => setDpr(1)}
    />
  );
}
