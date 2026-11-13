"use client";

import { useFrame } from "@react-three/fiber";
import { Matrix4 } from "three";
import { type MotionProps, through } from "../motion/cycle";
import { usePlayOnPoke } from "../motion/pointing";
import { moveInPrototype, turnAbout } from "../motion/prototype";
import { useParts } from "../motion/useParts";
import { DOORS, MOVE, SHUTTING, TILT, UNTILT } from "./Kamishibai.constants";

// Comic City's kamishibai theatre: each time the city is pointed at, its doors swing shut over the
// title card, stay shut a moment, then open on it again (the prototype's frames: door 0.75, 0.5,
// 0.25, 0, 0, 0, 0.25, 0.5, 0.75 at 140 ms each). The model is built open.

/** Comic City's kamishibai theatre, its doors closing and opening again */
export function Kamishibai(motion: MotionProps) {
  const { model, part, toModel } = useParts("/models/kamishibai.glb");
  const play = usePlayOnPoke(MOVE, motion);
  useFrame(() => {
    const t = motion.at ?? (play() ?? 0) / MOVE;
    const door = through(SHUTTING, t);
    for (const [name, hinge] of Object.entries(DOORS)) {
      const leaf = part(name);
      if (!leaf) continue;
      const swing = turnAbout(hinge.at, hinge.axis, hinge.open * (door - 1));
      moveInPrototype(leaf, toModel, new Matrix4().copy(TILT).multiply(swing).multiply(UNTILT));
    }
  });
  return <primitive object={model} />;
}
