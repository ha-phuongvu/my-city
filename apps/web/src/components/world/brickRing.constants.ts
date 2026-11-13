// The fixed numbers brickRing.ts builds with: the ground height, the wall's size, its colours, and each box's faces.

// the prototype's ground height
export const G = 0.15;
// how thick the wall is, and how high each course of bricks
export const THICK = 0.3;
export const COURSE = 0.14;
export const BRICKS = ["#b4553f", "#a84a37", "#bf6249", "#9c4535", "#b85a42"];
export const MORTAR = "#d9c8ae";

// each box's faces, by its corners (the underside, 0 1 2 3, is left out)
export const FACES = [
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [1, 2, 6, 5],
  [2, 3, 7, 6],
  [3, 0, 4, 7],
];
