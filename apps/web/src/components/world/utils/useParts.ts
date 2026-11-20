"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Matrix4, type Mesh, type Object3D } from "three";
import { useRoomLight, withRoomLight } from "./roomLight";
import { frameOf, prototypeMatrix } from "./prototype";
import { DRACO } from "../constants/Model.constants";

export type Parts = {
  /** this copy of the model, to show with <primitive object={model} /> */
  model: Object3D;
  /** one of its named parts (a door, the ball, the flag's cloth), or undefined if it has none by that name */
  part: (name: string) => Object3D | undefined;
  /** the model's parts whose names start with `prefix` (apple-0, apple-1, …) */
  partsNamed: (prefix: string) => Object3D[];
  /** prototype units → the model's own (see prototype.ts); none for a model without a frame */
  toModel: Matrix4;
};

/**
 * A copy of a GLB model whose parts can move: lit like Model (the room light), with its named
 * parts and the matrix from the prototype's units into it.
 */
export function useParts(src: string): Parts {
  const { scene } = useGLTF(src, DRACO);
  const light = useRoomLight();
  return useMemo(() => {
    const model = scene.clone();
    const named = new Map<string, Object3D>();
    model.traverse((object) => {
      if (object.name) named.set(object.name, object);
      const mesh = object as Mesh;
      if (mesh.isMesh && !Array.isArray(mesh.material)) {
        mesh.material = withRoomLight(mesh.material, light);
      }
    });
    const frame = frameOf(scene);
    return {
      model,
      part: (name: string) => named.get(name),
      partsNamed: (prefix: string) =>
        [...named.entries()]
          .filter(([name]) => name.startsWith(prefix))
          .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
          .map(([, object]) => object),
      toModel: frame ? prototypeMatrix(frame) : new Matrix4(),
    };
  }, [scene, light]);
}
