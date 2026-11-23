"use client";

import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  Box3,
  type InstancedMesh,
  type Material,
  Matrix4,
  type Mesh,
  Quaternion,
  Vector3,
} from "three";
import { DRACO, UP } from "../constants/core/Model.constants";
import { useRoomLight, withRoomLight } from "../utils/roomLight";

type Props = {
  src: string;

  center?: boolean;

  castShadow?: boolean;
} & ThreeElements["group"];

export function Model({ src, center = false, castShadow = true, ...props }: Props) {
  const { scene } = useGLTF(src, DRACO);
  const light = useRoomLight();
  const copy = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((object) => {
      object.castShadow = castShadow;
      object.receiveShadow = true;
      const mesh = object as Mesh;
      if (mesh.isMesh && !Array.isArray(mesh.material)) {
        mesh.material = withRoomLight(mesh.material, light);
      }
    });
    return clone;
  }, [scene, castShadow, light]);
  const offset = useMemo(
    () => (center ? new Box3().setFromObject(scene).getCenter(new Vector3()).negate() : undefined),
    [scene, center],
  );
  return (
    <group {...props}>
      <primitive object={copy} position={offset} />
    </group>
  );
}

export function useModelSize(src: string): Vector3 {
  const { scene } = useGLTF(src, DRACO);
  return useMemo(() => new Box3().setFromObject(scene).getSize(new Vector3()), [scene]);
}

export function preloadModel(src: string) {
  useGLTF.preload(src, DRACO);
}

export type Placement = { x: number; z: number; y?: number; yaw?: number; scale?: number };

export function ModelInstances({
  src,
  items,
  castShadow = true,
}: {
  src: string;
  items: Placement[];

  castShadow?: boolean;
}) {
  const { scene } = useGLTF(src, DRACO);
  const light = useRoomLight();
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const found: { mesh: Mesh; material: Material; local: Matrix4 }[] = [];
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh && !Array.isArray(mesh.material)) {
        found.push({
          mesh,
          material: withRoomLight(mesh.material, light),
          local: object.matrixWorld,
        });
      }
    });
    return found;
  }, [scene, light]);
  return parts.map(({ mesh, material, local }) => (
    <InstancedPart
      key={mesh.uuid}
      mesh={mesh}
      material={material}
      local={local}
      items={items}
      castShadow={castShadow}
    />
  ));
}

function InstancedPart({
  mesh,
  material,
  local,
  items,
  castShadow,
}: {
  mesh: Mesh;
  material: Material;
  local: Matrix4;
  items: Placement[];
  castShadow: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const instances = ref.current;
    if (!instances) return;
    const matrix = new Matrix4();
    const turn = new Quaternion();
    items.forEach((item, i) => {
      turn.setFromAxisAngle(UP, item.yaw ?? 0);
      matrix
        .compose(
          new Vector3(item.x, item.y ?? 0, item.z),
          turn,
          new Vector3().setScalar(item.scale ?? 1),
        )
        .multiply(local);
      instances.setMatrixAt(i, matrix);
    });
    instances.instanceMatrix.needsUpdate = true;
    instances.computeBoundingSphere();
  }, [items, local]);
  return (
    <instancedMesh
      ref={ref}
      args={[mesh.geometry, material, items.length]}
      castShadow={castShadow}
      receiveShadow
    />
  );
}
