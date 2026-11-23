// The fixed values foliageMesh.ts draws with: the prototype's view, its ground height, the plants' palette and its light.

import { bySeason } from "../utils/season";

export type V3 = [number, number, number];
export type RGB = [number, number, number];

// the shape a mass of leaves takes: an ellipsoid, a clipped square with rounded corners, or a pine tier
export enum CrownShape {
  Ball = "ball",
  Box = "box",
  Cone = "cone",
}

export const VIEW: V3 = [1, 1, 1];
// The map's ground is at z 0.15; in three.js it is at y 0
export const GROUND = 0.15;

// (in winter, the winter prototype's: deeper winter greens and winter reds)
const P_SUMMER = {
  leaf: "#568f52",
  leafLight: "#a6c96c",
  leafDeep: "#3d6e48",
  trunk: "#74463a",
  hydBlue: "#4b9fc0",
  hydViolet: "#c784a6",
  pink: "#f07a84",
  white: "#fff6e6",
  yellow: "#f5b347",
};
const P_WINTER: typeof P_SUMMER = {
  ...P_SUMMER,
  leaf: "#3f6e57",
  leafLight: "#6f9a74",
  leafDeep: "#2d5344",
  hydBlue: "#5b86b0",
  hydViolet: "#b0495a",
  pink: "#d2414b",
};
export const P = bySeason(P_SUMMER, P_WINTER);

/** The map's plant colours (treeLayout.ts gives each its summer one) as they are in this season */
export const IN_SEASON: Record<string, string> = Object.fromEntries(
  (Object.keys(P_SUMMER) as (keyof typeof P_SUMMER)[]).map((k) => [P_SUMMER[k], P[k]]),
);

// In winter the leaves are a cool sage, frosted at their lightest, not spring's lime (leafMass's
// tones for the winter greens)
export const WINTER_LEAF = {
  toward: "#7fae7c",
  by: 0.4,
  frost: "#d9e9da",
  sage: "#a2c7a4",
  deep: "#6f9f78",
};

// Snow lying on the plants in winter, thicker the flatter they face up (`from` to `to` of the way up,
// `most` at most), from the shadow's blue to the lit white (the winter prototype's snowOn)
export const SNOW = { light: "#fbfcff", shade: "#c6d3e3", from: 0.3, to: 0.75, most: 0.95 };

// A tree bare for the winter in place of a round, an apple or a garden tree: a trunk, then limbs
// reaching up and out (and one up the middle), each splitting into branches and those into twigs, with
// lumps of snow in the limbs' forks and snow along the top of every branch (the winter prototype's
// bareTree). Its bark and twigs, the snow, how many limbs (the least; one more on an apple tree and on
// every other round one), how far up they reach (radians, round tree and apple tree), how long a limb
// is (of the tree's size) and each branch of the one before (the least and how much more), how far a
// branch opens from its limb (the least and how much more), how many branches each limb and each
// branch has, how thick a limb is at its foot, and how far up a branch's side must face to be snowy
export const BARE = {
  bark: "#5f4a42",
  twig: "#7a645a",
  snow: "#f6f8fb",
  limbs: 4,
  reach: [0.85, 0.6],
  length: [0.48, 0.56],
  shorter: [0.58, 0.15],
  open: [0.35, 0.3],
  split: [3, 2],
  thick: 0.065,
  snowy: 0.45,
} as const;
// a garden tree is drawn this much bigger bare than leafy (the winter prototype's 2.3 for 1.25)
export const BARE_GARDEN = 2.3 / 1.25;

export const SUN: RGB = [252, 223, 168];
export const SHADE: RGB = [51, 68, 95];
export const FADE: RGB = [238, 236, 226];

// An apple, like a real red one: round, a little wider at its shoulders than its foot, a hollow at
// the top where a short curved stalk comes out and a small dimple underneath. Its outline from the
// dimple under it round to the hollow on top, [out from the middle, up], in its radius
export const APPLE_PROFILE: [number, number][] = [
  [0, -0.74],
  [0.2, -0.82],
  [0.46, -0.8],
  [0.7, -0.66],
  [0.88, -0.42],
  [0.98, -0.12],
  [1, 0.16],
  [0.95, 0.42],
  [0.83, 0.64],
  [0.62, 0.8],
  [0.4, 0.83],
  [0.24, 0.74],
  [0.1, 0.6],
  [0, 0.56],
];
// how many sides round it, and its skin: deep red underneath, its own red (deepened toward crimson)
// over most of it, a golden
// flush round the hollow on top and yellow-green inside it; streaks of a darker red run up its sides
export const APPLE_SIDES = 20;
export const APPLE_SKIN = {
  crimson: "#c41e2c",
  deep: "#8f1f22",
  gold: "#e9a944",
  hollow: "#c9b45a",
  streak: "#a3262a",
};
// the stalk: brown, thin, curving off to one side, its tip darker ([out, up] along it, in the radius)
export const APPLE_STALK = {
  color: "#7a5230",
  tip: "#4f3420",
  width: 0.1,
  path: [
    [0, 0.56],
    [0.03, 0.85],
    [0.12, 1.08],
    [0.26, 1.2],
  ] as [number, number][],
};
