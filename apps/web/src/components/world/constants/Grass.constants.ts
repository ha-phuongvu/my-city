// The fixed values Grass.tsx works with: where the grass comes from, its colours and how wide it is drawn.

export const SRC = "/models/world-grass.bin";

// the grass's three tones, each from its darkest (standing up) to its palest (bent over by a wave)
export const GRASS_TONES = [
  ["#6fa64a", "#79ae51", "#86b85b", "#93c166"],
  ["#82b85a", "#8dc063", "#9bc96e", "#a9d27a"],
  ["#97c96b", "#a3d075", "#b1d982", "#bfe190"],
];
export const STEM = "#5f8f45";
// how wide on screen, in CSS pixels, and at least how wide on the map when zoomed out (the page's
// 0.06 on its picture, each picture unit √(2/3) of a map unit), for the blades and the flowers' stems
export const BLADE = { pixels: 1.2, least: 0.06 * Math.sqrt(2 / 3) };
export const STALK = { pixels: 1, least: 0.03 * Math.sqrt(2 / 3) };
export const SEGMENTS = 5;
