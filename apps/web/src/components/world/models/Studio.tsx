"use client";

import type { ThreeElements } from "@react-three/fiber";
import type { MotionProps } from "../utils/cycle";
import { useParts } from "../utils/useParts";
import { ChimneySmoke } from "./ChimneySmoke";
import { CHIMNEYS } from "../constants/Studio.constants";

// The Writer's Studio with smoke rising from both its brick chimneys (mStudio's steam(), in the
// prototype's units)

type Props = Pick<MotionProps, "speed" | "at"> & ThreeElements["group"];

/** The Writer's Studio and its chimney smoke, in the model's own units */
export function Studio({ speed, at, ...props }: Props) {
  const { model, toModel } = useParts("/models/studio.glb");
  return (
    <group {...props}>
      <primitive object={model} />
      <group matrixAutoUpdate={false} matrix={toModel}>
        {CHIMNEYS.map((chimney, i) => (
          <ChimneySmoke
            key={i}
            from={chimney.from}
            size={chimney.size}
            chimney={i}
            speed={speed}
            at={at}
          />
        ))}
      </group>
    </group>
  );
}
