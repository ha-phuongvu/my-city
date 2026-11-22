"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { MotionProps } from "../../utils/cycle";
import { moveInPrototype, turnAbout } from "../../utils/prototype";
import { useParts } from "../../utils/useParts";
import { AXLE, ROUND, STEP, STEP_TIME } from "../../constants/cities/movie/FilmReel.constants";

// Movie City's film reel spins like a projector's for as long as the city is pointed at, and when
// the pointer leaves it stops where it is (the prototype's spinOn). The prototype turns the five
// holes in its front plate 9 degrees every 110 ms (mReel's rot); the rest of the reel is round, so
// only the holes move, and every fifth of a turn they look as they started.

/** Movie City's film reel, spinning while the city is pointed at */
export function FilmReel({ speed = 1, at, pointing }: MotionProps) {
  const { model, part, toModel } = useParts("/models/film-reel.glb");
  // how far round it has turned (degrees, within a fifth of a turn)
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
