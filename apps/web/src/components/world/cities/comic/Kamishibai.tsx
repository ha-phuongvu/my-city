"use client";

import { useFrame } from "@react-three/fiber";
import { Matrix4 } from "three";
import { type MotionProps, through } from "../../utils/cycle";
import { usePlayWhilePointed } from "../../utils/pointing";
import { moveInPrototype, turnAbout } from "../../utils/prototype";
import { useParts } from "../../utils/useParts";
import {
  AGAIN,
  DOORS,
  MOVE,
  SHUTTING,
  TILT,
  UNTILT,
} from "../../constants/cities/comic/Kamishibai.constants";

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
