// The fixed numbers Kamishibai.tsx works with: the doors' hinges, the box's tilt and the doors' frames.

import { Matrix4 } from "three";
import { turnAbout } from "../motion/prototype";

export const R = Math.SQRT1_2;
// each door's hinge as mComic sets it up, before the whole box is tipped back: a point on it, the
// way it turns, and how far it swings open (degrees)
export const DOORS = {
  "door-left": { at: [1.02624, 2.44045, 2.45], axis: [0, 0, 1], open: 118 },
  "door-right": { at: [2.44045, 1.02624, 2.45], axis: [0, 0, -1], open: 118 },
  "door-top": { at: [1.77577, 1.77577, 3.09], axis: [R, -R, 0], open: 100 },
};
// the whole box is tipped back 6 degrees about its middle (TILT_COMIC), hinges and all
export const TILT = turnAbout([1.5, 1.5, 2.45], [R, -R, 0], 6);
export const UNTILT = new Matrix4().copy(TILT).invert();

export const SHUTTING = [1, 0.75, 0.5, 0.25, 0, 0, 0, 0.25, 0.5, 0.75, 1];
export const STEP = 0.14;
export const MOVE = (SHUTTING.length - 1) * STEP;
