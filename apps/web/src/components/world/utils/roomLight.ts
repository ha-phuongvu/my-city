import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import {
  type Material,
  MeshStandardMaterial,
  PMREMGenerator,
  type Texture,
  type WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { STRENGTH } from "../constants/roomLight.constants";

const made = new WeakMap<WebGLRenderer, Texture>();

export function useRoomLight(): Texture {
  const gl = useThree((state) => state.gl);
  return useMemo(() => {
    let texture = made.get(gl);
    if (!texture) {
      const pmrem = new PMREMGenerator(gl);
      texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
      made.set(gl, texture);
    }
    return texture;
  }, [gl]);
}

export function withRoomLight(material: Material, light: Texture): Material {
  if (!(material instanceof MeshStandardMaterial)) return material;
  const copy = material.clone();
  copy.envMap = light;
  copy.envMapIntensity = STRENGTH;
  return copy;
}
