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
import { STRENGTH } from "./roomLight.constants";

// Soft, even light from all round, made on the spot from three.js's RoomEnvironment (no download).
// The Tripo models are made to be lit like this: without it they come out dark and dull. It goes on
// the models' own materials rather than the whole scene, because on the flat ground it washes the
// palette out (and three.js ignores a material's own strength for the scene-wide light).

const made = new WeakMap<WebGLRenderer, Texture>();

/** The room light for this renderer, made once */
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

/** A copy of a model's material that takes the room light */
export function withRoomLight(material: Material, light: Texture): Material {
  if (!(material instanceof MeshStandardMaterial)) return material;
  const copy = material.clone();
  copy.envMap = light;
  copy.envMapIntensity = STRENGTH;
  return copy;
}
