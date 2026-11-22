// The fixed numbers TurningPage.tsx works with: book.glb's pages, the grid of a turning page, the turn and the paper.

// The resting pages in book.glb, in the model's own units: how far a page reaches from the spine,
// how tall it is, and how far each side lies open (28 degrees, as on its Models card)
export const PAGE = { width: 1.85, height: 2.1, open: (28 * Math.PI) / 180 };

// Where the spine meets the foot of the pages in book.glb, the way a page would lie if the book
// were opened flat (toward the right-hand page), and straight out of the book toward the reader
export const SPINE = [0.4268, 0.62, -0.4268] as const;
export const FLAT = [Math.SQRT1_2, 0, Math.SQRT1_2] as const;
export const FRONT = [-Math.SQRT1_2, 0, Math.SQRT1_2] as const;

// As in the prototype: 28 columns out from the spine and 16 rows up the page, the corner leading
// by 30% of the turn
export const COLUMNS = 28;
export const ROWS = 16;
export const LAG = 0.3;

// As on the map: the turn plays 27 steps of 34 ms
export const TURN = 27 * 0.034;
// while Story City is pointed at, the next page turns this long (s) after the last one has settled
export const AGAIN = 0.5;

// The paper (the pages' colour), and how many pixels across the page its printing is drawn
export const PAPER = "#f8ead0";
export const PRINT_PIXELS = 1024;
