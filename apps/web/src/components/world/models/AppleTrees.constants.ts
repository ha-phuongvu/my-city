// The fixed numbers AppleTrees.tsx works with: the map's view and the timing of a dropped apple.

import { Vector3 } from "three";

export const PICTURE = Math.sqrt(2 / 3);
export const RIGHT = new Vector3(1, 0, -1).normalize();
export const DROP_EVERY = 1.6;
// the drop (apple-drop): 3.6 s from letting go to faded out, then 2.5 s gone, then 1 s growing back
export const DROP = 3.6;
export const GONE = 2.5;
export const REGROW = 1;
// a fallen apple's middle is 0.065 × its tree's size up, a hanging one's radius 0.07 × it
export const LYING = 0.065 / 0.07;
