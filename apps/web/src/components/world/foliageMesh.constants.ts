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
