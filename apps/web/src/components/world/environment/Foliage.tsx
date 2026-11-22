"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  DoubleSide,
  type Material,
  type Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  RGBADepthPacking,
} from "three";
import { TREE_GROWTH } from "../constants/environment/Foliage.constants";
import { buildFoliage, fallingLeafTones } from "../utils/foliageMesh";
import { AppleTrees } from "./AppleTrees";
import { type Crown, FallingLeaves } from "./FallingLeaves";
import { WIND_GLSL, windNoise } from "../utils/wind";
import { OUTSKIRTS_TREES } from "../utils/outskirts";
import { isWinter } from "../utils/season";
import {
  type Apple,
  type AppleTreePlacement,
  type TreePlacement,
  TREES,
  type Trees,
} from "../constants/treeLayout.constants";

// The plants lean in the wind plant by plant, each from its own foot with the gust where it stands
// (utils/wind.ts): the mesh's "sway" attribute carries every corner's foot and how far its plant
// sways, and the vertex shader slides it over by its height. Its shadow leans with it. As on the
// prototype, the plants stand still for anyone who has asked for less motion.

/** A tree grown from its foot */
const grow = <T extends TreePlacement>(t: T): T => ({ ...t, s: (t.s ?? 1) * TREE_GROWTH });

/** An apple tree grown from its foot, with apples on its back too (the prototype only hangs them on the side it shows) */
function growApples(t: AppleTreePlacement): AppleTreePlacement {
  const foot = t.y ?? 0;
  const out = ([x, y, z, color]: Apple): Apple => [
    t.x + (x - t.x) * TREE_GROWTH,
    foot + (y - foot) * TREE_GROWTH,
    t.z + (z - t.z) * TREE_GROWTH,
    color,
  ];
  // the same apples turned halfway round the trunk
  const behind = ([x, y, z, color]: Apple): Apple => [2 * t.x - x, y, 2 * t.z - z, color];
  return {
    ...grow(t),
    hanging: [...t.hanging, ...t.hanging.map(behind)].map(out),
    fallen: [...t.fallen, ...t.fallen.map(behind)].map(out),
  };
}

// the map's own plants and the outskirts' woods (outskirts.ts)
// (in winter, with the round trees bare, one in three of the map's is a pine instead, so there's green
// among them, as on the winter prototype)
const evergreen = (t: TreePlacement) =>
  isWinter() && ((Math.round(t.x * 13 + t.z * 7) % 3) + 3) % 3 === 0;

const GROWN: Trees = {
  ...TREES,
  leafy: TREES.leafy.map(grow),
  round: [...TREES.round.filter((t) => !evergreen(t)), ...OUTSKIRTS_TREES.round].map(grow),
  apple: [...TREES.apple, ...OUTSKIRTS_TREES.apple].map(growApples),
  pine: [...TREES.pine, ...TREES.round.filter(evergreen), ...OUTSKIRTS_TREES.pine].map(grow),
  bush: [...TREES.bush, ...OUTSKIRTS_TREES.bush],
};

/** Makes a material lean its corners in the wind, at the time in `wind.value` (kept in its userData) */
function inTheWind<M extends Material>(material: M, wind: { value: number }, still: boolean): M {
  material.userData.wind = wind;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.windTime = wind;
    shader.uniforms.windNoise = { value: windNoise() };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>\nattribute vec3 sway;\nuniform float windTime;\n${WIND_GLSL}`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>\n${still ? "" : "transformed = windLean(transformed, sway, windTime);"}`,
      );
  };
  return material;
}

/**
 * Every tree, pine, bush and hydrangea on the map (treeLayout.ts), leaf by leaf as the prototype
 * draws them, the trees grown TREE_GROWTH times. Their colours already carry the prototype's sun and shade, so they are drawn unlit;
 * they still cast the sun's shadows. Pointing at a round tree shakes leaves loose from it, and
 * pointing at an apple tree drops its apples.
 */
export function Foliage() {
  const geometry = useMemo(() => buildFoliage(GROWN), []);
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const plants = useRef<Mesh>(null);
  // the materials, sharing the wind's clock
  const [look, depth] = useMemo(() => {
    const wind = { value: 0 };
    return [
      inTheWind(new MeshBasicMaterial({ vertexColors: true, side: DoubleSide }), wind, still),
      inTheWind(new MeshDepthMaterial({ depthPacking: RGBADepthPacking }), wind, still),
    ];
  }, [still]);
  // each round tree's crown, where its leaves come loose (roundTree: the crown 1.08 × its size up)
  const crowns = useMemo<Crown[]>(
    () =>
      GROWN.round.map((t) => {
        const s = t.s ?? 1;
        return {
          center: [t.x, (t.y ?? 0) + 1.08 * s, t.z],
          across: 0.56 * s,
          up: 0.53 * s,
          size: s,
          tones: fallingLeafTones(t.color),
        };
      }),
    [],
  );
  useFrame(({ clock }) => {
    const material = plants.current?.material as Material | undefined;
    if (material) material.userData.wind.value = clock.elapsedTime;
  });
  return (
    <>
      <mesh
        ref={plants}
        geometry={geometry}
        material={look}
        customDepthMaterial={depth}
        castShadow
      />
      {!isWinter() && <AppleTrees trees={GROWN.apple} still={still} />}
      {!still && <FallingLeaves crowns={crowns} />}
    </>
  );
}
