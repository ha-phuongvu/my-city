// The fixed values Winter.tsx works with: the falling snow, the Christmas tree by the plaza and the presents
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

// The Christmas tree, a fir like a Christmas card's, on the snow just outside the plaza's wall, left of
// the fountain as the opening view looks, between the lanes to Comic City and Game City: where its foot
// stands and how high over the ground, how tall (to the star) and how wide at the bottom, and how much
// of its trunk shows under the branches; how many tiers, each so much of the one under it (taller,
// wider), how far up the one below each starts, and how its top curves (1 a straight cone, less flaring
// out toward the rim like a skirt); `size`: all of it, its drift of snow and its presents too, is drawn
// that many times as big round its foot
export const TREE = {
  at: [-6.65, 6.65],
  foot: 0.01,
  height: 7.6,
  radius: 2,
  bare: 1.8,
  tiers: 6,
  shrink: [0.88, 0.8],
  over: 0.5,
  bow: 0.8,
  size: 2,
  // its greens (the sunny tips, the middle, the dark notches, the shade under each tier), its snow
  // (lumpy bands along the tiers and a cap on top) and its trunk (and the bark's dark lines)
  green: ["#3f8c52", "#2b6a42", "#1d4c31", "#153a26"],
  snow: "#f3f7fb",
  trunk: ["#7a4a2c", "#55311d"],
  // the gold star on top, and the soft warm haze round it (only a haze, no disc of its own)
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
// its spiky branch tips: how many round the bottom tier and at least round the top one, how far out
// they start, how far in the notches between them are and how far the tips hang down (of a tier's
// width and height)
export const TIPS = { count: 30, least: 14, from: 0.8, notch: 0.2, droop: 0.2 } as const;
// The strings of fairy lights on the tree: how many, from near the bottom to near the top; each hung in
// swags about `swag` long that sag `sag`, with a bulb every `spacing`; the wire's colour and thickness;
// the bulbs' colours, in turn along the strings, and a bulb's size. They come on a colour at a time in
// that order (red, yellow, blue, green, purple), each for `step` seconds, fading in and out, while the
// others are `dim`
export const TREE_LIGHTS = {
  strings: 6,
  swag: 1.1,
  sag: 0.16,
  spacing: 0.2,
  wire: "#2a2420",
  thick: 0.014,
  colors: ["#ff3d3d", "#ffc83c", "#4aa8ff", "#5ad46c", "#c46cff"],
  size: 0.3,
  step: 1.4,
  dim: 0.45,
} as const;
// the red stockings hung from its tips: [tier, from the bottom; turn from facing the opening view,
// degrees, + to the right]; their colour and their white cuffs
export const STOCKINGS = {
  at: [
    [4, 24],
    [3, 44],
    [2, -36],
  ],
  color: "#c8323a",
  cuff: "#f6f2ea",
} as const;
// a bulb on the tree's strings has its colour's place in their round; any other glow has this
export const NO_CHASE = -1;

// The presents under the tree: [turn round the tree (degrees, 45 toward the opening view), how far out,
// width, depth, height, box, ribbon]
export const PRESENTS: [number, number, number, number, number, string, string][] = [
  [80, 1.05, 0.62, 0.5, 0.42, "#c83a3a", "#f1c24f"],
  [112, 1.25, 0.48, 0.48, 0.55, "#2f6b4f", "#d63c3c"],
  [-48, 1.3, 0.42, 0.42, 0.3, "#f3e8d2", "#c83a3a"],
  [145, 0.95, 0.55, 0.4, 0.36, "#3f6ca8", "#e9eef4"],
  [-80, 1.1, 0.5, 0.5, 0.48, "#e4b444", "#c83a3a"],
  [185, 1.05, 0.46, 0.46, 0.34, "#c83a3a", "#2f6b4f"],
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
