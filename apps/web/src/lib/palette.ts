// Colors and light from the "My City Map and Models" prototype (Color palettes tab), so the 3D scene
// matches the reference pictures the models are made from.

// Howl's Moving Castle: the world map, the countryside, the city symbols and the fountain
export const HOWL = {
  light: {
    sun: "#fcdfa8",
    shade: "#33445f",
    sky: { top: "#4b9fc0", mid: "#a6d3dc", low: "#e6eee2" },
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
} as const;

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
