"use client";

import { type ThreeElements, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { type MotionProps, useCycle } from "../../utils/cycle";
import { useParts } from "../../utils/useParts";
import { TRIP, WAIT } from "../../constants/cities/story/Train.constants";

type Props = Pick<MotionProps, "speed" | "at"> &
  ThreeElements["group"] & {
    from: number;
    to: number;
  };

export function Train({ from, to, speed = 1, at, ...props }: Props) {
  const { model } = useParts("/models/train.glb");
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const clock = useCycle(TRIP + WAIT, { speed: still ? 0 : speed });
  const body = useRef<Group>(null);

  const start = (-from / (to - from)) * TRIP;
  useFrame(() => {
    if (!body.current) return;

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
