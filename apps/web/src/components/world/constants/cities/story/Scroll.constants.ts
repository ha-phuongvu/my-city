// The fixed numbers Scroll.tsx works with: the scroll, its words' face, the quill's nib and how long the writing takes.

import { Vector3 } from "three";

// the scroll on its card (scrollSign(0, -0.2, 0.15, -22, 1.7, 2.3)): where it stands, which way it
// faces, its size and the radii of its rolls
export const ORIGIN = [0, -0.2, 0.15];
export const TURN = ((45 - 22) * Math.PI) / 180;
export const F = [Math.cos(TURN), Math.sin(TURN), 0];
export const ACROSS = [F[1], -F[0], 0];
export const W = 1.7;
export const H = 2.3;
export const ROLL = { bottom: 0.2, top: 0.17 };
// the words go on the sheet between 0.1 and 0.9 of the way up it, 0.16 in from each side
export const PAD = 0.16;
export const WIDTH = W - 2 * PAD;
export const HEIGHT = 1.47878;
export const LIFT = 0.008;
export const U = WIDTH / 1.16;
export const INK = "#26304f";
// the quill's nib where it rests (the model's quill was moved 0.05 toward the viewer, off the sheet)
export const NIB = new Vector3(0.30316 + F[0] * 0.05, -0.69014 + F[1] * 0.05, 0.7611);

// the writing, top to bottom, as the page sets it: the first word big, the rest under it, a
// flourish, then the status; each written in its own time (ms), the nib taking 260 ms to reach a
// line and 380 ms to go back to rest at the end
export const WRITE = {
  name: 0.95,
  rest: 0.75,
  flourish: 0.42,
  status: 0.8,
  reach: 0.26,
  back: 0.38,
};
// while Story City is pointed at, the name stands written this long (s) before the quill writes it again
export const AGAIN = 1.2;
