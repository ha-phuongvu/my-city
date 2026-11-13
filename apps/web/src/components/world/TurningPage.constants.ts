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

// The resting pages' colours and lines of writing: five bars from 0.28 out from the spine to 0.32
// short of the page's edge, 0.07 tall, the first 0.45 up the page and then every 0.32
export const PAPER = "#f8ead0";
export const INK = "#c9b497";
export const LINES = { from: 0.28, to: 1.53, first: 0.45, gap: 0.32, height: 0.07, count: 5 };
