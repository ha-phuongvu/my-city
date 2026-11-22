// The fixed values Winter.tsx works with: the falling snow, the plaza's Christmas tree and the presents
// under it, the fairy lights on the walls, and the snowmen (the winter prototype's XMAS3D). Places are
// on the map, in three.js's x and z.

import { Vector3 } from "three";

// up, and the way the opening view looks from (what the snowmen face)
export const UP = new Vector3(0, 1, 0);
export const FACE = new Vector3(1, 0, 1).normalize();

// The snow: how many flakes; the box they fall in round the spot the camera looks at (as wide as the
// camera is far, times `box`, in steps of `step`; as tall as `high` of that); a flake's size (of the
// box's width) and the least and most it's drawn (CSS pixels); how long a flake takes to fall the box's
// height (s, the slowest and the fastest), how far it drifts with the wind in a second (of the box's
// width, along the opening view's right and toward us) and how far it sways (of the box's width); its
// colour; how long it takes to come in once the opening's wave sets off (ms); and the seed its flakes
// are scattered from
export const SNOWFALL = {
  count: 2600,
  box: 1.6,
  step: 1.3,
  high: 0.5,
  size: 0.0015,
  pixels: [1.3, 7],
  fall: [18, 30],
  drift: [0.006, 0.0025],
  sway: 0.004,
  color: "#ffffff",
  comeIn: 700,
  seed: 2512,
} as const;

// The plaza's tree: where its foot stands, how tall (to the star) and how wide at the bottom, standing
// on the paving (`foot` up); how many tiers, each so much of the one under it (taller, wider), and how
// far up the one below each starts; its greens, its snow and its trunk; the garland (turns, thickness,
// colour); the baubles hung from each tier's tips (how many on each, from the bottom; their colours;
// their size, of the tier's width); the fairy lights on it (how many, how many turns); the star
export const TREE = {
  at: [-3.45, 0],
  foot: 0.062,
  height: 7.2,
  radius: 1.35,
  tiers: 6,
  shrink: [0.86, 0.84],
  over: 0.5,
  green: ["#2c5a45", "#3a6c53", "#244a3a"],
  snow: "#f3f7fb",
  trunk: "#6a4330",
  garland: { turns: 3.2, thick: 0.05, color: "#e4b445" },
  baubles: {
    count: [8, 7, 6, 5, 3, 2],
    colors: ["#c8323a", "#e7b545", "#d3dbe4", "#c8323a", "#e7b545"],
    size: 0.1,
    cap: "#d8d2c4",
  },
  lights: { count: 84, turns: 4.5 },
  star: {
    outer: 0.46,
    inner: 0.19,
    color: "#f7c84a",
    shine: "#fff3c4",
    glow: 2.2,
    light: "#ffe08a",
    twinkle: 1.6,
  },
} as const;
// a tier's outline from its top down round its drooping rim and back under to the trunk ([out, up] of
// its width and height)
export const TIER: [number, number][] = [
  [0, 1],
  [0.12, 0.89],
  [0.24, 0.78],
  [0.38, 0.63],
  [0.52, 0.48],
  [0.66, 0.33],
  [0.8, 0.18],
  [0.9, 0.09],
  [1, 0],
  [0.9, -0.07],
  [0.55, 0.02],
  [0.15, 0.14],
];

// The presents under the tree: [turn round the tree (degrees, 45 toward the opening view), how far out,
// width, depth, height, box, ribbon]
export const PRESENTS: [number, number, number, number, number, string, string][] = [
  [30, 1.05, 0.62, 0.5, 0.42, "#c83a3a", "#f1c24f"],
  [62, 1.25, 0.48, 0.48, 0.55, "#2f6b4f", "#d63c3c"],
  [5, 1.3, 0.42, 0.42, 0.3, "#f3e8d2", "#c83a3a"],
  [95, 0.95, 0.55, 0.4, 0.36, "#3f6ca8", "#e9eef4"],
  [-30, 1.1, 0.5, 0.5, 0.48, "#e4b444", "#c83a3a"],
  [150, 1.05, 0.46, 0.46, 0.34, "#c83a3a", "#2f6b4f"],
];

// The fairy lights on the walls: how far apart the bulbs are, the hooks they hang from (every so many
// bulbs) and how far they droop between; how big a bulb is (map units) and the least it's drawn (CSS
// pixels); their colours, the warm ones more often; how fast they twinkle (s, the slowest and the
// fastest); and the least length of wall that gets a string. They hang from the top of each wall
export const LIGHTS = {
  spacing: 0.45,
  hook: 4,
  droop: 0.12,
  size: 0.26,
  least: 3.2,
  colors: ["#ffd36b", "#ffc04d", "#ffe7a8", "#ff7a5c", "#ffd36b", "#8fdc7a", "#ffe7a8", "#7cc0ff"],
  twinkle: [1.4, 3.2],
  shortest: 1.2,
} as const;
// how far from a city's middle its wall's bricks are looked for, how far off its ring a brick may be,
// how tall a box of the plaza's wall may be and still be the wall (not a gatepost), and how far round
// the ring a piece may reach and still be one piece of wall (radians)
export const WALL_REACH = [1, 7] as const;
export const WALL_OFF = 0.35;
export const WALL_HIGHEST = 0.7;
export const WALL_SPAN = 0.6;

// The snowmen out in the snow by the lanes: [x, z, turn from facing the opening view (degrees), size,
// hat (0 a top hat, 1 a knitted hat, 2 a bobble hat), scarf]
export const SNOWMEN: [number, number, number, number, 0 | 1 | 2, string][] = [
  [-3.2, -6.9, -10, 1, 1, "#c63b3b"],
  [28.6, 6.9, 15, 1.05, 0, "#2f6b4f"],
  [-22.1, 32.3, -20, 0.95, 2, "#3f6ca8"],
];
export const SNOWMAN = {
  snow: "#f4f7fb",
  shadow: "#d3dce8",
  coal: "#2a2a2e",
  carrot: "#e8823a",
  twig: "#5a3a26",
  hat: "#2b2b30",
  band: "#c63b3b",
  knit: ["#c63b3b", "#2f6b4f"],
  bobble: "#f6f2ea",
} as const;
