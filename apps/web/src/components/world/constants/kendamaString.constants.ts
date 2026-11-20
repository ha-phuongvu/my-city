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
// how far from the wood the string keeps, all along it: `most`, but less near the knot (none for the
// first `from` of it, then `near`, more by `ramp` for each unit further), so it leaves the wood at a
// good slant rather than running along it
export const CLEAR = { from: 0.04, near: 0.02, ramp: 0.6, most: 0.1 };
// behind the toy, the knot goes no lower on the back of the cross-piece than this (as a share of how
// far behind the ball is), so the string leaves it going back, well above the handle, not down along it
export const KNOT_DROP = 0.25;
