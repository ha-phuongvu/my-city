// The fixed numbers River.tsx works with: the water's width, how high the streaks lie, and their lines,
// dashes and speeds.

// the water is 2.2 wide (the prototype's river(rv, 2.2)) and lies 0.016 up; the streaks lie just over it
export const WIDTH = 2.2;
export const LIFT = 0.02;
// the five streaks: how far each runs from the river's middle (toward its left bank going downstream),
// wobbling `size` either way as it goes (by sin(point number × along + its distance out × across))
export const LANES = [-0.72, -0.36, 0, 0.36, 0.72];
export const WOBBLE = { size: 0.1, along: 0.45, across: 7 };
// each streak's dashes and gaps on the prototype's picture (each pattern adds up to 3.2, the distance a
// streak drifts in one go), and how many seconds that takes: the middle of the river runs fastest. Each
// starts 0.7 s on from the one before
export const DASHES = [
  [0.5, 0.35, 0.25, 2.1],
  [0.9, 0.6, 0.3, 1.4],
  [0.35, 0.9, 0.6, 1.35],
  [0.7, 2.5],
  [0.45, 0.3, 0.8, 1.65],
];
export const PATTERN = 3.2;
export const DRIFT = [3.8, 3.0, 2.6, 3.1, 3.9];
export const STAGGER = 0.7;
// a streak's line on the picture: 0.055 wide, white and half opaque
export const LINE = { width: 0.055, opacity: 0.5 };
