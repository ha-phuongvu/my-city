"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Matrix4, type Mesh, type Object3D } from "three";
import { useRoomLight, withRoomLight } from "./roomLight";
import { frameOf, prototypeMatrix } from "./prototype";
import { DRACO } from "../constants/core/Model.constants";

export type Parts = {
  model: Object3D;

  part: (name: string) => Object3D | undefined;

  partsNamed: (prefix: string) => Object3D[];

  toModel: Matrix4;
};

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
