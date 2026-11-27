import type { RGB } from "../constants/foliageMesh.constants";

export const hexRgb = (h: string): RGB =>
  [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
export const rgbHex = (c: RGB) =>
  "#" +
  c
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
export const mixRgb = <T extends number[]>(a: T, b: T, t: number): T =>
  a.map((v, i) => v + (b[i] - v) * t) as T;
export const tint = (a: string, b: string, k: number) => rgbHex(mixRgb(hexRgb(a), hexRgb(b), k));
