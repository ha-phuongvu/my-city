"use client";

import { useFrame } from "@react-three/fiber";
import { Matrix4 } from "three";
import { type MotionProps, through } from "../utils/cycle";
import { usePlayWhilePointed } from "../utils/pointing";
import { moveInPrototype, turnAbout } from "../utils/prototype";
import { useParts } from "../utils/useParts";
import { AGAIN, DOORS, MOVE, SHUTTING, TILT, UNTILT } from "../constants/Kamishibai.constants";

// Comic City's kamishibai theatre: while the city is pointed at, its doors swing shut over the title
// card, stay shut a moment, then open on it again: the side doors first and the top one folding down
// over them, then the other way round (SHUTTING). After a pause on the card they shut again, until the
// pointer leaves; then they finish opening and stay open. The model is built open.

/** Comic City's kamishibai theatre, its doors closing and opening again */
export function Kamishibai(motion: MotionProps) {
  const { model, part, toModel } = useParts("/models/kamishibai.glb");
  const play = usePlayWhilePointed(MOVE, motion, AGAIN);
  useFrame(() => {
    const t = motion.at ?? (play() ?? 0) / MOVE;
    for (const [name, hinge] of Object.entries(DOORS)) {
      const leaf = part(name);
      if (!leaf) continue;
      const door = through(SHUTTING[hinge.moves], t);
      const swing = turnAbout(hinge.at, hinge.axis, hinge.open * (door - 1));
      moveInPrototype(leaf, toModel, new Matrix4().copy(TILT).multiply(swing).multiply(UNTILT));
    }
  });
  return <primitive object={model} />;
}
