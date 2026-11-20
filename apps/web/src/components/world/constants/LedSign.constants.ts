// The fixed numbers LedSign.tsx works with: the board's face, its dots and colours, and the name's lettering and run.

// the board's face on its card (ledSign(0, 0, 0.15)): top left, top right, bottom left, and its size
export const FACE = [
  [-0.74176, 0.85631, 1.03],
  [0.85631, -0.74176, 1.03],
  [-0.74176, 0.85631, 0.22],
] as const;
export const WIDTH = 2.26;
export const HEIGHT = 0.81;
// straight out of the board toward the viewer, and how far the face sits in front of the screen
export const OUT = [Math.SQRT1_2, Math.SQRT1_2, 0] as const;
export const LIFT = 0.01;

export const SCREEN = "#16171d";
// how finely the board is drawn (canvas pixels to a unit of the card), so its dots stay sharp close up
export const PIXELS = 600;
export const DOT = 0.06;
export const UNLIT = { color: "rgba(255, 181, 71, 0.13)", radius: 0.012 };
// the lit dots, as the prototype's page masks the words with them: each dot shows the part of the words
// that falls in it, solid out to 52% of the way from its middle to its cell's corner and gone by 64%,
// and they glow
export const LIT = { inner: 0.52, outer: 0.64, glow: "rgba(255, 160, 50, 1)", blur: 0.04 };
export const RUN = 5;
// the name's lettering, in the lit dots' amber (the prototype's 0.41 map units tall, which is 0.37 on
// the card the board is drawn on, as the map's board is stretched from 0.95 to 1.05 tall), where its
// line sits (8% down the board), the status line, and the red dot after the name on the running strip
export const NAME = { size: 0.37, weight: 800, spacing: 0.06, color: "#ffd77e" };
// standing still, the name fills at most this share of the board's width (as on the prototype's page;
// with a wider font than the prototype's it's made a little smaller to fit)
export const STILL_FILL = 0.95;
export const STRIP_TOP = 0.08 * HEIGHT;
export const SUB_BOTTOM = 0.07 * HEIGHT;
export const SPOT = { size: 0.16, margin: 0.3, color: "#ff6b5b" };
