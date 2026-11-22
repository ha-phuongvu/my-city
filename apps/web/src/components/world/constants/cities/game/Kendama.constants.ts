// The fixed numbers Kendama.tsx works with: the toy's frame, the ball's path round it and how it turns,
// and the string.

import { Matrix4 } from "three";

// the toy's own frame (mKendama: across, up, and how far behind its plane) is scaled 1.3, turned
// -70 degrees and set at (1.5, 1.5, 1.2) in the prototype's units
export const TOY = new Matrix4()
  .makeTranslation(1.5, 1.5, 1.2)
  .multiply(new Matrix4().makeRotationZ((-70 * Math.PI) / 180))
  .multiply(new Matrix4().makeScale(1.3, 1.3, 1.3));
// where the ball is: [across, up] in the toy's plane, and how far behind it (on the way round it
// passes behind the handle)
export type Spot = [across: number, up: number, behind?: number];
export const REST: Spot = [0, 2.98];
export const PATH: Spot[] = [
  REST,
  [0.05, 3.5],
  [0.7, 3.42],
  [1.35, 2.62],
  [1.56, 1.72, 0.6],
  [1.15, 0.85, 0.6],
  [0.5, 0.5, 0.95],
  [-0.3, 0.5, 0.95],
  [-1.0, 0.9, 0.6],
  [-1.4, 1.9, 0.6],
  [-0.95, 3.1],
  [-0.3, 3.62],
  [0, 3.15],
  REST,
];
export const STEP = 0.13;
// how the ball turns on the way (mKendama): on the spike its hole faces the cross-piece's middle, down
// onto the spike; as it gets from `from` to `from + over` away from there, the hole turns a quarter turn
// on, and it's kept square to `up` (in the toy's frame) as nearly as it can be
export const BALL_TURN = { from: 0.2, over: 0.6, up: [0.09, 1, 0] as const };
export const SWING = (PATH.length - 1) * STEP;
// while Game City is pointed at, the ball sits on the spike this long (s) before it pops off again
export const AGAIN = 0.6;
// the string's thickness and colour; it eases from its resting bow into the trailing curve over this
// share of the swing as the ball leaves the spike, and back as it lands
export const STRING = { radius: 0.014, color: "#f2ead8" };
export const EASE_IN = 0.06;
