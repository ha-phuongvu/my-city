"use client";

import { useLayoutEffect } from "react";
import { type Mesh, MeshStandardMaterial, type Object3D, SRGBColorSpace } from "three";
import { preloadModel } from "./Model";
import { CameraFlash } from "./models/CameraFlash";
import { FlowerBeds } from "./models/FlowerBeds";
import { useParts } from "./utils/useParts";
import { PAPER } from "./constants/Scenery.constants";
import { SCENERY, type SceneryPlacement } from "./constants/sceneryLayout.constants";

// The scenery models on the world map, each its own GLB where the prototype puts it: Game City's
// bunting and toy blocks, Music City's flower beds (which grow while the city is pointed at), Movie
// City's film strip, camera (which flashes and shines its beam while the city is pointed at) and
// marquee, the plans and scaffold on the future-city plot, and the stone bridge over the river.

/** Mixes every colour of a model's copy `amount` of the way toward the paper, as the prototype does (in sRGB) */
function fade(model: Object3D, amount: number) {
  const paper = PAPER.getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
  model.traverse((object) => {
    const material = (object as Mesh).material;
    if (!(material instanceof MeshStandardMaterial)) return;
    const c = material.color.getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
    material.color.setRGB(
      c.r + (paper.r - c.r) * amount,
      c.g + (paper.g - c.g) * amount,
      c.b + (paper.b - c.b) * amount,
      SRGBColorSpace,
    );
  });
}

function Placed({ model, position, yaw, scale, fade: amount }: SceneryPlacement) {
  const src = `/models/${model}.glb`;
  const { model: copy } = useParts(src);
  useLayoutEffect(() => {
    if (amount) fade(copy, amount);
  }, [copy, amount]);
  return <primitive object={copy} position={position} rotation-y={yaw} scale={scale} />;
}

export function Scenery() {
  return (
    <>
      {SCENERY.map((placement) =>
        placement.model === "flower-bed" ? (
          <FlowerBeds key={placement.model} {...placement} />
        ) : (
          <Placed key={placement.model} {...placement} />
        ),
      )}
      <CameraFlash />
    </>
  );
}

for (const { model } of SCENERY) preloadModel(`/models/${model}.glb`);
