"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { MotionProps } from "../../utils/cycle";
import { moveInPrototype, turnAbout } from "../../utils/prototype";
import { useParts } from "../../utils/useParts";
import { AXLE, ROUND, STEP, STEP_TIME } from "../../constants/cities/movie/FilmReel.constants";

export function FilmReel({ speed = 1, at, pointing }: MotionProps) {
  const { model, part, toModel } = useParts("/models/film-reel.glb");

  const turned = useRef(0);
  useFrame((_, delta) => {
    if (pointing) turned.current = (turned.current + (delta * speed * STEP) / STEP_TIME) % ROUND;
    const holes = part("holes");
    if (holes)
      moveInPrototype(
        holes,
        toModel,
        turnAbout(AXLE.at, AXLE.axis, at === undefined ? turned.current : at * ROUND),
      );
  });
  return <primitive object={model} />;
}
