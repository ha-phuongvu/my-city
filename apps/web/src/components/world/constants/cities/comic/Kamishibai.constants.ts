// The fixed numbers Kamishibai.tsx works with: the doors' hinges, the box's tilt and the doors' frames.

import { Matrix4 } from "three";
import { turnAbout } from "../../../utils/prototype";

// which frames a door moves by: the side doors' or the top one's
export enum DoorMove {
  Side = "side",
  Top = "top",
}

export const R = Math.SQRT1_2;
// each door's hinge as mComic sets it up, before the whole box is tipped back: a point on it, the
// way it turns, how far it swings open (degrees), and which frames it moves by
export const DOORS = {
  "door-left": { at: [1.02624, 2.44045, 2.45], axis: [0, 0, 1], open: 118, moves: DoorMove.Side },
  "door-right": { at: [2.44045, 1.02624, 2.45], axis: [0, 0, -1], open: 118, moves: DoorMove.Side },
  "door-top": { at: [1.77577, 1.77577, 3.09], axis: [R, -R, 0], open: 100, moves: DoorMove.Top },
} as const;
// the whole box is tipped back 6 degrees about its middle (TILT_COMIC), hinges and all
export const TILT = turnAbout([1.5, 1.5, 2.45], [R, -R, 0], 6);
export const UNTILT = new Matrix4().copy(TILT).invert();

// The doors' frames (1 open, 0 shut), every 70 ms. The prototype swings all three together (door 0.75,
// 0.5, 0.25, 0, 0, 0, 0.25, 0.5, 0.75 at 140 ms each), which its flat picture can do as it draws the
// top door over the side ones; but shut, the top door lies in front of them, so in 3D it would pass
// through them on the way. Here the side doors shut first and the top one folds down over them, and it
// lifts clear (past level, where it can't touch them) before they open; they stay shut as long as before.
export const SHUTTING = {
  [DoorMove.Side]: [1, 0.8, 0.6, 0.4, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.2, 0.4, 0.6, 0.8, 1],
  [DoorMove.Top]: [1, 1, 1, 1, 1, 1, 2 / 3, 1 / 3, 0, 0, 0, 0, 0, 1 / 3, 2 / 3, 1, 1, 1, 1, 1, 1],
};
export const STEP = 0.07;
export const MOVE = (SHUTTING[DoorMove.Side].length - 1) * STEP;
// while Comic City is pointed at, the doors stay open on the title card this long (s) before they shut again
export const AGAIN = 1.2;
