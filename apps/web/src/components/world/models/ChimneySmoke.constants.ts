// The fixed numbers ChimneySmoke.tsx works with: the plume's size and pace, a puff's keyframes and the wind.

// A plume is 2.6 × its size across (the map's box); each puff starts 0.34 of that wide. 26 puffs
// follow each other up, each taking 7 s (0.6 s longer for each further chimney of a building, so
// neighbouring plumes drift apart).
export const ACROSS = 2.6;
export const PUFF = 0.34;
export const PUFFS = 26;
export const LIFE = 7;
export const LIFE_STEP = 0.6;
// The map's keyframes for a puff, in puff widths: how far it has risen and gone sideways (sway,
// then downwind), how big it is, and how strong (× its own strength), at each share of its life
export const KEYS = [
  { at: 0, up: 0, sway: 0, wind: 0, size: 0.3 },
  { at: 0.28, up: 1.7, sway: 1, wind: 0, size: 0.75 },
  { at: 0.6, up: 4.0, sway: -0.6, wind: 0.4, size: 1.6 },
  { at: 1, up: 6.4, sway: 0, wind: 1, size: -1 }, // the last size is the puff's own (2.4 to 3.2)
];
export const FADE = [
  { at: 0, strength: 0 },
  { at: 0.05, strength: 1 },
  { at: 0.6, strength: 0.75 },
  { at: 1, strength: 0 },
];
// A puff starts with its middle a little over the chimney's mouth (in puff widths)
export const START = 0.08;
// The way the wind blows the smoke: toward the right of the map's view
export const R = Math.SQRT1_2;
export const DOWNWIND = [R, -R, 0];
