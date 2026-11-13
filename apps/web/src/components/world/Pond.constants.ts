// The fixed numbers Pond.tsx works with: how high the streaks lie, their dashes, and how often the rings come round.

// just above the water (the prototype's water lies 0.008 up, its streaks 0.013)
export const LIFT = 0.013;
// each streak's dashes and gaps, on the prototype's picture (each pattern adds up to 3.5)
export const DASHES = [
  [0.6, 0.4, 0.3, 2.2],
  [1.0, 0.5, 0.4, 1.6],
  [0.4, 0.9, 0.7, 1.5],
  [0.8, 2.7],
  [0.5, 0.3, 0.9, 1.8],
  [0.7, 2.8],
];
export const PATTERN = 3.5;
export const RING_TIME = 6.8;
