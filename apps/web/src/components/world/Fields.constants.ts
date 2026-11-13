// The fixed values Fields.tsx works with: the flower model, how a patch grows back, its colours and every flower.

import { Color } from "three";
import { FLOWER_COLORS, FLOWER_PATCHES, type FlowerPatch } from "./fieldLayout";

export const FLOWER = "/models/flower.glb";

// Pointing at a patch of flowers (or tapping it) cuts it back and grows it again, as on the
// prototype's map (its growOnce): the flowers cut back to their leaves, shoots, then the buds
// swelling and opening, all in 1.5 s; then it stands in bloom again. Pointing at it again while it
// grows doesn't start it over.
export const GROW = 1.5;
// the prototype's CROP_STAGES.bloom, a stage every 125 ms: first cut back, then these, then in full flower (1)
export const STAGES = [0, 0.14, 0.28, 0.4, 0.48, 0.56, 0.63, 0.7, 0.77, 0.84, 0.92, 1];
export const CUT = GROW / 12;

// The prototype's colours for a growing flower (its palette, and fieldFlower's mixes of it): its
// leaves, which its buds start out as
export const LEAF = "#568f52";

export const WHITE = new Color(1, 1, 1);

export const PINK_SHADE = 0.4;

export type Plant = {
  x: number;
  z: number;
  height: number;
  turn: number;
  patch: FlowerPatch;
  petals: string;
  late: number;
};

// every flower on the map, each knowing the patch it grows with
export const FLOWERS: Plant[] = FLOWER_PATCHES.flatMap((patch) =>
  Array.from({ length: patch.flowers.length / 5 }, (_, i) => {
    const [x, z, height, colors, turn] = patch.flowers.slice(i * 5, i * 5 + 5);
    return { x, z, height, turn, patch, petals: FLOWER_COLORS[colors][0], late: (i * 0.618) % 1 };
  }),
);
