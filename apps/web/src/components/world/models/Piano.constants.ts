// The fixed numbers Piano.tsx works with: the keyboard, the tune and the rising notes.

// the keyboard, in the prototype's units (mPiano): where the white keys start, how long they are,
// how wide each one is (17 across 1.5) and the height of their tops
export const KEYS = { x: 2.27, y: 0.8, length: 0.38, width: 1.5 / 17, top: 2.06 };
export const PRESSED = { color: "#ddd0b8", height: 0.052, gap: 0.007 };
export const TUNE = [3, 5, 7, 5, 10, 8, 6, 4];
export const NOTE_TIME = 0.3;

// the ♪s: where they start over the piano and how they drift (in the prototype's units), and how
// long each takes to rise and fade, the three setting off 1.2 s apart
export const NOTES = [
  { glyph: "♪", across: -0.49, delay: 0 },
  { glyph: "♫", across: 0.38, delay: 1.2 },
  { glyph: "♪", across: 0.04, delay: 2.4 },
];
export const NOTE_FROM = [1.69, 1.405, 3.5];
export const NOTE_RISE = 1.6;
export const NOTE_DRIFT = 0.3;
export const NOTE_SIZE = 0.6;
export const NOTE_LIFE = 3.6;
export const R = Math.SQRT1_2;
