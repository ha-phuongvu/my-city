// The fixed values face.ts works with: the fonts the words on the signs are drawn in.

// where a line of words is drawn from: its left end or its middle
export enum TextAlign {
  Left = "left",
  Center = "center",
}

// The prototype page's fonts, then the nearest ones a computer is likely to have
export const FONTS = {
  display: '"Kaisei Decol", Georgia, "Times New Roman", serif',
  body: '"Zen Kaku Gothic New", system-ui, -apple-system, "Segoe UI", sans-serif',
  script: '"Dancing Script", "Snell Roundhand", "Apple Chancery", "Brush Script MT", cursive',
  stencil: '"Saira Stencil One", "DIN Condensed", "Arial Narrow", Impact, sans-serif',
  music: '"Noto Music", "Apple Symbols", "Segoe UI Symbol", serif',
};
