"use client";

import type { MotionProps } from "../../utils/cycle";
import { Model } from "../../core/Model";
import { TurningPage } from "./TurningPage";

export function Book(motion: MotionProps) {
  return (
    <group>
      <Model src="/models/book.glb" castShadow={false} />
      <TurningPage {...motion} />
    </group>
  );
}
