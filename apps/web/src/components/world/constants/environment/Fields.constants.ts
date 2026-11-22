// The fixed values Fields.tsx works with: the flower model, how a patch grows back, its colours and every flower.

import { Color } from "three";
import { FLOWER_COLORS, FLOWER_PATCHES, type FlowerPatch } from "../fieldLayout.constants";
import { outskirtsPatches } from "../../utils/outskirts";
import { bySeason } from "../../utils/season";

export const FLOWER = "/models/flower.glb";

// Pointing at a patch of flowers (or tapping it) cuts it back and grows it again, as on the
// prototype's map (its growOnce): the flowers cut back to their leaves, shoots, then the buds
// swelling and opening, all in 1.5 s; then it stands in bloom again. While the pointer stays on it,
// it grows again after standing in bloom a while (AGAIN, s); once the pointer leaves it finishes
// growing and stays in bloom.
export const GROW = 1.5;
export const AGAIN = 1;
// the prototype's CROP_STAGES.bloom, a stage every 125 ms: first cut back, then these, then in full flower (1)
export const STAGES = [0, 0.14, 0.28, 0.4, 0.48, 0.56, 0.63, 0.7, 0.77, 0.84, 0.92, 1];
export const CUT = GROW / 12;
// the stage just after it is cut back: drawn as 0, but a stage of its own, apart from STAGES' first
export const CUT_BACK = -1;

// The prototype's colours for a growing flower (its palette, and fieldFlower's mixes of it): its
// leaves, which its buds start out as
export const LEAF = "#568f52";

export const WHITE = new Color(1, 1, 1);

export const PINK_SHADE = 0.4;

// In winter the patches stand under snow, as on the winter prototype: every part of a flower is
// frosted this far toward the snow's white (none in summer)
export const FROST = bySeason(0, 0.62);
export const FROST_COLOR = new Color("#f4f7fb");

export type Plant = {
  x: number;
  z: number;
  height: number;
  turn: number;
  patch: FlowerPatch;
  petals: string;
  late: number;
};

// the map's patches and the outskirts' (outskirts.ts), copies of the map's moved out there
export const PATCHES: FlowerPatch[] = [...FLOWER_PATCHES, ...outskirtsPatches(FLOWER_PATCHES)];

// every flower on the map, each knowing the patch it grows with
export const FLOWERS: Plant[] = PATCHES.flatMap((patch) =>
  Array.from({ length: patch.flowers.length / 5 }, (_, i) => {
    const [x, z, height, colors, turn] = patch.flowers.slice(i * 5, i * 5 + 5);
    return { x, z, height, turn, patch, petals: FLOWER_COLORS[colors][0], late: (i * 0.618) % 1 };
  }),
);
