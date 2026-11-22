"use client";

import type { ThreeElements } from "@react-three/fiber";
import type { MotionProps } from "../../utils/cycle";
import { useParts } from "../../utils/useParts";
import { ChimneySmoke } from "./ChimneySmoke";
import { CHIMNEY } from "../../constants/cities/story/Library.constants";

// The Grand Library with steam puffing from the boiler chimney behind it (mLibrary's steam(), in the
// prototype's units)

type Props = Pick<MotionProps, "speed" | "at"> & ThreeElements["group"];

/** The Grand Library and its chimney smoke, in the model's own units */
export function Library({ speed, at, ...props }: Props) {
  const { model, toModel } = useParts("/models/library.glb");
  return (
    <group {...props}>
      <primitive object={model} />
      <group matrixAutoUpdate={false} matrix={toModel}>
        <ChimneySmoke from={CHIMNEY.from} size={CHIMNEY.size} speed={speed} at={at} />
      </group>
    </group>
  );
}
