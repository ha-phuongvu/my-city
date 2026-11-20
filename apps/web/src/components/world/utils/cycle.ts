"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

/** What a moving model is told by the map */
export type MotionProps = {
  /** how fast it plays: 1 as on the prototype's map, 0 to stop */
  speed?: number;
  /** hold it at this moment of its motion (0 to 1) instead of playing */
  at?: number;
  /** whether the pointer is on the model (or its city) now: its motion plays for as long as it stays */
  pointing?: boolean;
};

/**
 * The time into a motion that repeats every `length` seconds, on its own clock so it can be slowed
 * or stopped; `at` holds it at that share of the round instead. Read it inside useFrame.
 */
export function useCycle(length: number, { speed = 1, at }: MotionProps): () => number {
  const clock = useRef(0);
  useFrame((_, delta) => {
    clock.current = (clock.current + delta * speed) % length;
  });
  return () => (at === undefined ? clock.current : at * length);
}

/** Slow, fast, then slow again, for t from 0 to 1 */
export function ease(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);
}

/**
 * The value t (0 to 1) of the way through a list of key values, as the prototype steps through its
 * frames, but gliding smoothly from each one to the next
 */
export function through(values: readonly number[], t: number): number {
  const last = values.length - 1;
  const k = Math.min(last, Math.max(0, t * last));
  const i = Math.min(last - 1, Math.floor(k));
  return values[i] + (values[i + 1] - values[i]) * (k - i);
}
