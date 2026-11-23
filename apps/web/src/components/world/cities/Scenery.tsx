"use client";

import { useLayoutEffect } from "react";
import { type Mesh, MeshStandardMaterial, type Object3D, SRGBColorSpace } from "three";
import { preloadModel } from "../core/Model";
import { CameraFlash } from "./movie/CameraFlash";
import { FlowerBeds } from "./music/FlowerBeds";
import { useParts } from "../utils/useParts";
import { PAPER } from "../constants/cities/Scenery.constants";
import {
  SCENERY,
  SceneryModel,
  type SceneryPlacement,
} from "../constants/cities/sceneryLayout.constants";

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
        placement.model === SceneryModel.FlowerBed ? (
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
