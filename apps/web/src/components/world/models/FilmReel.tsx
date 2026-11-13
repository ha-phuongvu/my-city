"use client";

import { useFrame } from "@react-three/fiber";
import type { MotionProps } from "../motion/cycle";
import { usePlayOnPoke } from "../motion/pointing";
import { moveInPrototype, turnAbout } from "../motion/prototype";
import { useParts } from "../motion/useParts";
import { AXLE, ROUND, STEP, STEP_TIME } from "./FilmReel.constants";

// Movie City's film reel turns a fifth of a turn each time the city is pointed at. The prototype
// turns the five holes in its front plate 9 degrees every 110 ms (mReel's rot); the rest of the reel
// is round, so only the holes move. After a fifth of a turn the holes look as they started.

/** Movie City's film reel, turning when pointed at */
export function FilmReel(motion: MotionProps) {
  const { model, part, toModel } = useParts("/models/film-reel.glb");
  const play = usePlayOnPoke((ROUND / STEP) * STEP_TIME, motion);
  useFrame(() => {
    const holes = part("holes");
    if (holes) moveInPrototype(holes, toModel, turnAbout(AXLE.at, AXLE.axis, ((play() ?? 0) / STEP_TIME) * STEP));
  });
  return <primitive object={model} />;
}
