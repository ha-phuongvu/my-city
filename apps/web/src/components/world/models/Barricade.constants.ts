// The fixed numbers Barricade.tsx works with: the board's face and colours, and its two lamps and how they blink.

// the board's face on its card (constructionSign(0, 0, 0.15, -10)), its size, and straight out of it
export const FACE = [
  [-0.59735, 0.9612, 1.88],
  [0.69893, -0.89008, 1.88],
  [-0.59735, 0.9612, 0.89],
] as const;
export const WIDTH = 2.26;
export const HEIGHT = 0.99;
export const TURN = ((45 - 10) * Math.PI) / 180;
export const OUT = [Math.cos(TURN), Math.sin(TURN), 0] as const;
export const LIFT = 0.004;
// the page sizes everything on the board by its width (--u)
export const U = WIDTH / 1.16;
export const INK = "#1c1b20";
export const YELLOW = "#ffcf33";

// the lamps: 8% in from each end of the board, standing on its top edge (0.02 above the face's top)
// in the middle of its thickness, 0.09 of the board's unit across
export const LAMP = { in: 0.08 * WIDTH + 0.045 * U, top: 0.02, back: 0.03, size: 0.09 * U };
export const OFF = "#c9741c";
export const ON = "#ffb21e";
export const GLOW = "rgba(255, 170, 30, 0.85)";
export const BLINK = 0.5;
export const BLINKS = 6;
export const LAG = 0.25;
export const PLAY = 3.2;
