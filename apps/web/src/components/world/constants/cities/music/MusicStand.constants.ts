// The fixed numbers MusicStand.tsx works with: the sign's page, its tune and the ribbon of music that flies out of it.

import { Matrix4 } from "three";

// the stand on its card (musicStand(0, 0, 0.15, -22)): which way it faces and its desk's numbers
export const TURN = ((45 - 22) * Math.PI) / 180;
export const F = [Math.cos(TURN), Math.sin(TURN), 0];
export const ACROSS = [F[1], -F[0], 0];
export const W = 1.9;
export const H = 2.3;
export const DESK = 1.25;
export const TILT = (16 * Math.PI) / 180;
// up the desk (tipped back), the foot of the booklet, the pages' width and height
export const UP = [-F[0] * Math.sin(TILT), -F[1] * Math.sin(TILT), Math.cos(TILT)];
export const FOOT = [F[0] * 0.02, F[1] * 0.02, 0.15 + H - DESK * 0.95 + 0.06];
export const PAGE = { width: W / 2 - 0.04, height: DESK - 0.12 };
// the face: 0.12 in from each side, from 0.06 below the pages' top to 0.06 above their foot
export const PAD = 0.12;
export const WIDTH = W - 2 * PAD;
export const HEIGHT = PAGE.height - 0.12;
export const LIFT = 0.006;
export const U = WIDTH / 1.16;
export const INK = "#4a2a2c";

// the staff, in its own little drawing (100 × 30) as the page draws it: the five lines, the clef,
// and the tune's notes [across, down]
export const TUNE = [
  [24, 21],
  [33, 18],
  [42, 15],
  [51, 18],
  [60, 12],
  [69, 15],
  [78, 9],
  [87, 15],
];
export const HOP = { time: 0.42, gap: 0.16, height: 3.5, grow: 0.12 };
export const PLAY = 3;

// The music flying out of the page (the prototype's MUSIC_FLOW): its own little picture, 224 × 132
// from 14 above its top, of five staff lines sweeping up and to the right in a wave, wider in the
// middle as if turning in the air, with a treble clef at its start and notes riding along it (some
// joined by beams). It lies over the pages with its foot 40% across and 46% up the face, 4.6 of the
// page's units wide, and runs out past the stand into the air.
export const FLOW = { left: 0.4, bottom: 0.46, top: -14, width: 224, height: 132, ink: "#3b2a2c" };
export const FLOW_UNIT = (4.6 * U) / FLOW.width;
// in front of the bowed pages (they bow out 0.11 at most)
export const FLOW_OUT = 0.13;
// the picture's canvas reaches this far past each side, for the notes' overshoot and the clef
export const FLOW_MARGIN = 8;
export const FLOW_K = 5;
// each note: [how far along, step on the staff (a line every two steps, the middle line at 0),
// joined by a beam to the next]
export const NOTES: [number, number, number?][] = [
  [0.15, 1],
  [0.21, -1, 1],
  [0.26, -2],
  [0.35, 2],
  [0.41, -1, 1],
  [0.46, -3],
  [0.55, 0],
  [0.62, -2, 1],
  [0.67, -1],
  [0.75, 3],
  [0.82, -2, 1],
  [0.87, -3],
  [0.94, 0],
];
// a note head's half width and height, turned -22 degrees
export const HEAD = { rx: 2.4, ry: 1.7, turn: (-22 * Math.PI) / 180 };
export const HEAD_HALF = [
  Math.hypot(HEAD.rx * Math.cos(HEAD.turn), HEAD.ry * Math.sin(HEAD.turn)),
  Math.hypot(HEAD.rx * Math.sin(HEAD.turn), HEAD.ry * Math.cos(HEAD.turn)),
];

// The picture's place on the stand: across the desk, up it and out of it, a picture unit each, from
// its foot (0, 0) with y up the picture
export const FLOW_PLACE = (() => {
  const x0 = -W / 2 + PAD + FLOW.left * WIDTH;
  const up0 = PAGE.height - 0.06 - (1 - FLOW.bottom) * HEIGHT;
  const o = [0, 1, 2].map((i) => FOOT[i] + ACROSS[i] * x0 + UP[i] * up0 + F[i] * FLOW_OUT);
  const [a, u, f] = [ACROSS, UP, F].map((v) => v.map((c) => c * FLOW_UNIT));
  return new Matrix4().set(
    a[0],
    u[0],
    f[0],
    o[0],
    a[1],
    u[1],
    f[1],
    o[1],
    a[2],
    u[2],
    f[2],
    o[2],
    0,
    0,
    0,
    1,
  );
})();
