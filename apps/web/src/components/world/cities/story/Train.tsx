"use client";

import { type ThreeElements, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { type MotionProps, useCycle } from "../../utils/cycle";
import { useParts } from "../../utils/useParts";
import { TRIP, WAIT } from "../../constants/cities/story/Train.constants";

// Story City's visitor train only runs one way, as in the film (the prototype's runTrains): it
// crosses the city along the sea railway in 17 s, waits 5 s out of sight past the far edge, then
// comes in again from the near edge. It starts where it's placed, as the saved map shows it, and it
// leads with its front car, which points along +x in the model.

type Props = Pick<MotionProps, "speed" | "at"> &
  ThreeElements["group"] & {
    /** how far back along the railway it comes in, and how far on it goes out, from where it's
     * placed (in the model's units, `from` below 0 and `to` above it); both should be out of sight,
     * past the city's edges */
    from: number;
    to: number;
  };

/** The visitor train running along its railway, in the model's own units */
export function Train({ from, to, speed = 1, at, ...props }: Props) {
  const { model } = useParts("/models/train.glb");
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const clock = useCycle(TRIP + WAIT, { speed: still ? 0 : speed });
  const body = useRef<Group>(null);
  // how far into its trip it is where it's placed
  const start = (-from / (to - from)) * TRIP;
  useFrame(() => {
    if (!body.current) return;
    // `at` is a moment of the trip itself, not of the wait after it
    const t = at === undefined ? (clock() + start) % (TRIP + WAIT) : at * TRIP;
    body.current.visible = t <= TRIP;
    body.current.position.x = from + (to - from) * Math.min(1, t / TRIP);
  });
  return (
    <group {...props}>
      <group ref={body}>
        <primitive object={model} />
      </group>
    </group>
  );
}
