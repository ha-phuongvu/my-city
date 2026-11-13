"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { Matrix4, type Object3D } from "three";
import { preloadModel } from "./Model";
import { useParts } from "./motion/useParts";
import { leanAt, leanMatrix } from "./motion/wind";
import { SRC } from "./WorldProps.constants";

// The standing things on the prototype's world map that have no model card of their own, exactly
// where its buildWorld() puts them: each city's low brick wall and gateposts, the plot's heap of
// earth, and the pond's flat stones and reed clumps (the scenery with a card is Scenery.tsx's). One
// model (scratchpad anim-world/export.js), lit like the others, in map units, its colours faded for
// the cities not open yet as the prototype fades them. The map's camera always looks down, so it has
// every face but the undersides.
//
// Its parts are named (walls, gateposts, heap, pond-stones, reeds-0…). The reed clumps sway in
// the map's wind like the trees: each one's extras give the spot at its foot it leans from and how
// far (root, amp).

type Reed = { root: [number, number, number]; amp: number; rest: Matrix4 };

/** Leans a part `degrees` about the spot `root` at its foot, from where it stands at rest */
function leanFrom(part: Object3D, root: Reed["root"], degrees: number, rest: Matrix4) {
  part.matrix
    .makeTranslation(root[0], root[1], root[2])
    .multiply(leanMatrix(degrees))
    .multiply(new Matrix4().makeTranslation(-root[0], -root[1], -root[2]))
    .multiply(rest);
  part.matrixWorldNeedsUpdate = true;
}

export function WorldProps() {
  const { model, partsNamed } = useParts(SRC);
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const reeds = useMemo(
    () =>
      partsNamed("reeds-").map((part) => {
        part.updateMatrix();
        part.matrixAutoUpdate = false;
        return { part, ...(part.userData as Omit<Reed, "rest">), rest: part.matrix.clone() };
      }),
    [partsNamed],
  );
  useFrame(({ clock }) => {
    if (still) return;
    for (const { part, root, amp, rest } of reeds) {
      leanFrom(part, root, leanAt(amp, root[0], root[2], clock.elapsedTime), rest);
    }
  });
  return <primitive object={model} />;
}

preloadModel(SRC);
