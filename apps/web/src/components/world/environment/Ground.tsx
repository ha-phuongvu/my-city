"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import {
  AlwaysDepth,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  type Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
} from "three";
import { grain } from "../utils/grain";
import { MEADOW_PAINTED, MEADOW_REACH, SRC } from "../constants/environment/Ground.constants";
import { OUTSKIRTS_MEADOW } from "../utils/outskirts";

// Everything lying flat on the prototype's world map, exactly as its buildWorld() lays it: the
// meadow with its painted patches, the dirt paths with their cobbles and stepping stones, the
// river and its banks, the plaza's paving, the cities' packed-earth grounds, the dug plot, the pond
// with its lily pads, and the carpets of petals under the wild flower drifts. It is one model
// (scratchpad anim-world/export.js) whose faces carry the colour the prototype paints them, with its
// warm sun and its shade low down, and the faded colours of the cities not open yet.
//
// It is painted, not lit: the faces are in the prototype's drawing order and are drawn in that
// order whatever lies in front, before anything else, so each layer covers the one under it as on
// the prototype's map, however close together they lie. They still leave their depth behind, so
// whatever stands on the ground, or reaches a little below it, is hidden where the ground covers it.
// Past the prototype's own painting, the outskirts' meadow is painted in patches the same way
// (outskirts.ts), over the plain meadow and the model.

// fields and the ground share the same light grain, as on the prototype's map
const GROUND_GRAIN = grain(0);

/** The outskirts' painted patches, each filled from its middle, in the order they're painted */
function meadowPatches(): BufferGeometry {
  const position: number[] = [];
  const colour: number[] = [];
  const c = new Color();
  for (const { outline, color, lift } of OUTSKIRTS_MEADOW) {
    c.setStyle(color, SRGBColorSpace);
    const mid = outline.reduce(
      ([x, z], p) => [x + p[0] / outline.length, z + p[1] / outline.length],
      [0, 0],
    );
    outline.forEach((p, i) => {
      const q = outline[(i + 1) % outline.length];
      position.push(mid[0], lift, mid[1], q[0], lift, q[1], p[0], lift, p[1]);
      for (let k = 0; k < 3; k++) colour.push(c.r, c.g, c.b);
    });
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(position, 3));
  g.setAttribute("color", new Float32BufferAttribute(colour, 3));
  return g;
}

export function Ground() {
  const { scene } = useGLTF(SRC);
  const paint = useMemo(
    () =>
      new MeshBasicMaterial({
        ...GROUND_GRAIN,
        vertexColors: true,
        // always drawn, whatever is in the depth buffer, but writing its own depth (with the depth test
        // off, WebGL would write none)
        depthFunc: AlwaysDepth,
      }),
    [],
  );
  // the plain meadow round the model, painted first so the model covers it
  const meadow = useMemo(
    () => new MeshBasicMaterial({ ...GROUND_GRAIN, color: MEADOW_PAINTED, depthFunc: AlwaysDepth }),
    [],
  );
  const patches = useMemo(() => meadowPatches(), []);
  useEffect(
    () => () => {
      paint.dispose();
      meadow.dispose();
      patches.dispose();
    },
    [paint, meadow, patches],
  );
  const ground = useMemo(() => {
    const copy = scene.clone();
    copy.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh) {
        mesh.material = paint;
        mesh.renderOrder = -1;
        mesh.frustumCulled = false;
      }
    });
    return copy;
  }, [scene, paint]);
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} material={meadow} renderOrder={-2} frustumCulled={false}>
        <planeGeometry args={[2 * MEADOW_REACH, 2 * MEADOW_REACH]} />
      </mesh>
      <primitive object={ground} />
      <mesh geometry={patches} material={paint} renderOrder={-0.5} frustumCulled={false} />
    </>
  );
}

useGLTF.preload(SRC);
