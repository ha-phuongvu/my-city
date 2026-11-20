// The fixed values foliageMesh.ts draws with: the prototype's view, its ground height, the plants' palette and its light.

export type V3 = [number, number, number];
export type RGB = [number, number, number];

export const VIEW: V3 = [1, 1, 1];
// The map's ground is at z 0.15; in three.js it is at y 0
export const GROUND = 0.15;

export const P = {
  leaf: "#568f52",
  leafLight: "#a6c96c",
  leafDeep: "#3d6e48",
  trunk: "#74463a",
  hydBlue: "#4b9fc0",
  hydViolet: "#c784a6",
  white: "#fff6e6",
  yellow: "#f5b347",
};

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
