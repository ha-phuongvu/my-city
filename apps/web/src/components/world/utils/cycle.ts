"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

export type MotionProps = {
  speed?: number;

  at?: number;

  pointing?: boolean;
};

export function useCycle(length: number, { speed = 1, at }: MotionProps): () => number {
  const clock = useRef(0);
  useFrame((_, delta) => {
    clock.current = (clock.current + delta * speed) % length;
  });
  return () => (at === undefined ? clock.current : at * length);
}

export function ease(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);
}

export function through(values: readonly number[], t: number): number {
  const last = values.length - 1;
  const k = Math.min(last, Math.max(0, t * last));
  const i = Math.min(last - 1, Math.floor(k));
  return values[i] + (values[i + 1] - values[i]) * (k - i);
}
