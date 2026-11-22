"use client";

import { SoftShadows } from "@react-three/drei";
import { HOWL } from "../constants/palette.constants";
import { SHADOW_REACH, SUN_AT } from "../constants/core/WorldLights.constants";

// The light setup from the prototype's Models tab: a warm golden sun from the upper left, sky fill
// from above and meadow bounce from below, so shaded sides turn cool blue instead of grey. The sun
// casts soft shadows, as under the trees and symbols on the prototype's map. The models also take a
// soft room light of their own (roomLight.ts).
export function WorldLights() {
  return (
    <>
      <SoftShadows size={18} samples={12} focus={0.4} />
      <directionalLight
        color={HOWL.light.sun}
        intensity={3.0}
        position={SUN_AT}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-SHADOW_REACH}
        shadow-camera-right={SHADOW_REACH}
        shadow-camera-top={SHADOW_REACH}
        shadow-camera-bottom={-SHADOW_REACH}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <hemisphereLight args={[HOWL.light.sky.top, HOWL.light.ground, 1.9]} />
    </>
  );
}
