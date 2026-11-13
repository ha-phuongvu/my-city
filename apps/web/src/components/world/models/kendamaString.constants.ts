// The fixed numbers kendamaString.ts works with: the string's length, where it's tied and the wood it has to miss.

export const LENGTH = 1.75;
export const CROSS = { z: 1.9, r: 0.19 };
/** Points along the string, knot to ball */
export const POINTS = 17;
// the wood it has to miss: [axis, from, radius, to, radius] for the handle, the cross-piece and its
// cups, and the spike (mKendama's turned parts)
export const WOOD: [axis: "z" | "x", a0: number, r0: number, a1: number, r1: number][] = [
  ["z", 0, 0.25, 0.22, 0.15],
  ["z", 0.22, 0.15, 1.5, 0.165],
  ["z", 1.5, 0.165, 1.72, 0.2],
  ["x", 0.48, 0.19, 0.68, 0.28],
  ["x", -0.48, 0.19, 0.48, 0.19],
  ["x", -0.72, 0.34, -0.48, 0.19],
  ["z", 2.08, 0.13, 2.75, 0.02],
];
export const CLEAR = 0.08;
