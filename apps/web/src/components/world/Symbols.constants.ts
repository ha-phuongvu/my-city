// The fixed values Symbols.tsx works with: how each symbol is turned, its shadow and how far its lawn reaches.

// How far each symbol's GLB is turned so that, from the map's camera, it looks like its picture on
// the prototype's Models tab. The layout's turns start from that pose.
export const CARD_YAW: Record<string, number> = {
  book: Math.PI / 2,
  piano: 0,
  kendama: 0,
  "film-reel": -Math.PI / 4,
  kamishibai: 0,
};

// each symbol's soft shadow on the lawn below it
export const SHADOW_Y = 0.045;
export const SHADOW = { color: "#2c4430", opacity: 0.4, spread: 1.3 };

// Pointing anywhere on a city's walled lawn counts as pointing at the city (the prototype's
// .city-hit, the lawn's circle reaching this far from its middle: the lawn's PAD + 0.3)
export const LAWN_REACH = 5.3;
export const LAWN_Y = 0.03;
