// The fixed numbers NameSign.tsx works with: the front board's face, its paint and how a later city's sign fades.

import { Color } from "three";

// the front board's face on its card (aSign(0, 0, 0.15)), its size, and straight out of the board
export const FACE = [
  [-0.35574, 0.4645, 1.93283],
  [0.4645, -0.35574, 1.93283],
  [-0.1137, 0.70654, 0.38434],
] as const;
export const WIDTH = 1.16;
export const HEIGHT = 1.58587;
export const OUT = [Math.SQRT1_2, Math.SQRT1_2, 0] as const;
// in front of the grain streaks on the board (0.004 proud of it)
export const LIFT = 0.005;
export const U = WIDTH / 1.16;
export const CREAM = { open: "#f8efdc", later: "#efe5d2" };
export const SHADOW = { color: "rgba(40, 22, 10, 0.5)", blur: 0.02 * U };
// the page's faded colour (as its sRGB numbers, to mix in sRGB), and how far toward it a later
// city's sign is faded
export const FADE = new Color().setRGB(238 / 255, 236 / 255, 226 / 255);
export const FADED = 0.1;
