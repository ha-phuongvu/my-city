"use client";

import type { MotionProps } from "../motion/cycle";
import { Model } from "../Model";
import { TurningPage } from "../TurningPage";

/** Story City's open book, a page turning over it each time the city is pointed at */
export function Book(motion: MotionProps) {
  return (
    <group>
      <Model src="/models/book.glb" castShadow={false} />
      <TurningPage {...motion} />
    </group>
  );
}
