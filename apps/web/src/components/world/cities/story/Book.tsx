"use client";

import type { MotionProps } from "../../utils/cycle";
import { Model } from "../../core/Model";
import { TurningPage } from "./TurningPage";

/** Story City's open book, its pages turning over one after another while the city is pointed at */
export function Book(motion: MotionProps) {
  return (
    <group>
      <Model src="/models/book.glb" castShadow={false} />
      <TurningPage {...motion} />
    </group>
  );
}
