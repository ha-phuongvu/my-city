// Colors and light from the "My City Map and Models" prototype (Color palettes tab), so the 3D scene
// matches the reference pictures the models are made from.

import { bySeason } from "../utils/season";

// Howl's Moving Castle: the world map, the countryside, the city symbols and the fountain
const HOWL_SUMMER = {
  light: {
    sun: "#fcdfa8",
    shade: "#33445f",
    sky: { top: "#4b9fc0", mid: "#a6d3dc", low: "#e6eee2" },
    // the light from below, the ground's
    ground: "#8cb25e",
  },
  grass: "#8cb25e",
  meadow: "#a2c070",
  road: "#f2d29a",
  paving: "#efdcb8",
  stone: "#ddd0b6",
  stoneDark: "#a8977f",
  water: "#5fa9c0",
  waterLight: "#c4e6ee",
  wood: "#9a6548",
  roof: "#b0463f",
};

// the same in winter (the winter prototype's XMAS): snow on the meadow and the lawns, trodden snow on
// the lanes, dusted stones, cold dark water pale with ice, a pale sky and a low warm sun
const HOWL_WINTER: typeof HOWL_SUMMER = {
  light: {
    sun: "#fff0d9",
    shade: "#38486a",
    sky: { top: "#86a6c6", mid: "#cbd9e5", low: "#eef1f4" },
    ground: "#cdd8e2",
  },
  grass: "#e6edf3",
  meadow: "#edf2f6",
  road: "#d6c8b1",
  paving: "#dcd6cb",
  stone: "#dcd8d0",
  stoneDark: "#a8977f",
  water: "#4a7f9f",
  waterLight: "#cfe4ee",
  wood: "#9a6548",
  roof: "#b0463f",
};

export const HOWL = bySeason(HOWL_SUMMER, HOWL_WINTER);

// Spirited Away: Story City's own map and its five buildings
export const SPIRITED = {
  light: {
    sun: "#fcdca6",
    shade: "#2f3d5e",
    sky: { top: "#2c3a5a", mid: "#e58c6d", low: "#f3e5c8" },
  },
  bathhouseRed: "#b23a31",
  jadeRoof: "#3f7a6b",
  lanternGold: "#f0b04c",
  hillsideGrass: "#86a85a",
  spiritSea: "#6aafb0",
  chihiroPink: "#efb7b4",
  nightIndigo: "#2c3a5a",
  steamCream: "#f3e5c8",
} as const;
