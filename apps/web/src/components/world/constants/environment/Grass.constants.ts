// The fixed values Grass.tsx works with: where the grass comes from, its colours and how wide it is drawn.

import { bySeason } from "../../utils/season";

export const SRC = "/models/world-grass.bin";

// the grass's three tones, each from its darkest (standing up) to its palest (bent over by a wave)
export const GRASS_TONES = bySeason(
  [
    ["#6fa64a", "#79ae51", "#86b85b", "#93c166"],
    ["#82b85a", "#8dc063", "#9bc96e", "#a9d27a"],
    ["#97c96b", "#a3d075", "#b1d982", "#bfe190"],
  ],
  [
    ["#c7d4d2", "#d3dfde", "#dfe8e9", "#e9f0f2"],
    ["#d1dcdf", "#dce5e8", "#e6edf0", "#f0f4f7"],
    ["#dae4e8", "#e4ebf0", "#edf2f6", "#f6f9fb"],
  ],
);
export const STEM = bySeason("#5f8f45", "#7b6450");

// In winter the meadow is under snow, as on the winter prototype (its GRASS_SNOW): only the frosted
// tips show, `height` as tall as summer's, white and a little grey-green toward the `root`; of the
// wild flowers only one in `every` shows, as a sprig of red winter `berries` on a brown twig, `twig`
// as tall. (Summer's is every blade and flower at its own height.)
export const SNOW = bySeason(
  { on: false, height: 1, root: "#000000", every: 1, twig: 1, berries: [] as string[] },
  {
    on: true,
    height: 0.3,
    root: "#a3b4a9",
    every: 8,
    twig: 0.55,
    berries: ["#c8343c", "#a8262e", "#de5458"],
  },
);
// how wide on screen, in CSS pixels, and at least how wide on the map when zoomed out (the page's
// 0.06 on its picture, each picture unit √(2/3) of a map unit), for the blades and the flowers' stems
export const BLADE = { pixels: 1.2, least: 0.06 * Math.sqrt(2 / 3) };
export const STALK = { pixels: 1, least: 0.03 * Math.sqrt(2 / 3) };
export const SEGMENTS = 5;
