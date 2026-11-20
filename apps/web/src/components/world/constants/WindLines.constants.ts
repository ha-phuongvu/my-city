// The fixed numbers WindLines.tsx works with: how many lines, how long each lasts, and the wind on the ground.

import { Vector3 } from "three";
import { C30, WIND_DIR } from "./wind.constants";

export const MOST = 4;
export const POINTS = 33;
export const LIFE = 3.6;

// the wind's way on the ground: the step (x, z) that shows on the picture as WIND_DIR (the picture has
// x - z across, times cos 30°, and (x + z) / 2 down)
export const WIND = (() => {
  const across = WIND_DIR[0] / C30; // x - z
  const down = WIND_DIR[1] * 2; // x + z
  return new Vector3((across + down) / 2, 0, (down - across) / 2).normalize();
})();
// how many picture units a map unit along the wind is
export const ALONG = Math.hypot((WIND.x - WIND.z) * C30, (WIND.x + WIND.z) / 2);
export const THICK = 0.22 * Math.sqrt(2 / 3);
export const DRIFT = 1.4 / ALONG;
export const UP = new Vector3(0, 1, 0);
