// The fixed numbers Opening.tsx works with, as the prototype's opening (its OPENING). In winter it's the
// winter prototype's: "Merry Christmas" in red over "& welcome to my world", snow falling on the paper,
// holly and a red bow on the bell, and sleigh bells jingling when it's rung.

import { bySeason } from "../../utils/season";

// the words' font: Dancing Script Bold (OFL 1.1), each line of the welcome set whole as one "letter"
// ("1", "2"), with where each word's ink starts and ends across it and how many letters it has
export const FONT = bySeason(
  "/fonts/welcome-hand.typeface.json",
  "/fonts/welcome-hand-winter.typeface.json",
);

type Line = { glyph: string; size: number; at: [number, number]; write: number; ink?: string };

// The words, written on the paper in Story City's dark-blue ink. Each line is a line of the font: how
// big, where its baseline starts (across the paper from the bell, and up it), how long the quill takes
// to write it (ms) and its own ink, if not the dark blue (in winter "Merry Christmas" is in a deep
// Christmas red). The writing is stretched up the paper by `stand` so it reads upright from the camera,
// leans `slant` as the font's letters do, and lies `lift` above the paper
const RED = "#a3242c";
export const INK = {
  color: "#26304f",
  lines: bySeason<Line[]>(
    [
      { glyph: "1", size: 1.5, at: [-4.6, 5.1], write: 1050 },
      { glyph: "2", size: 2.3, at: [-3.4, 2.9], write: 950 },
    ],
    [
      { glyph: "1", size: 1.9, at: [-6.4, 4.5], write: 1200, ink: RED },
      { glyph: "2", size: 1.25, at: [-4.2, 2.7], write: 1250 },
    ],
  ),
  stand: 1.5,
  slant: 0.2,
  lift: 0.012,
};
// the flourish under them: where it starts and ends across the paper, how far up it, how far it dips
// and rises to its end, how wide it is, how long it takes to write, and its ink (in winter, the red)
export const FLOURISH = bySeason<{
  from: number;
  to: number;
  at: number;
  sag: number;
  rise: number;
  width: number;
  write: number;
  ink?: string;
}>(
  { from: -2.3, to: 3.2, at: 2.1, sag: 0.35, rise: 0.3, width: 0.17, write: 400 },
  { from: -2.0, to: 4.8, at: 2.05, sag: 0.35, rise: 0.3, width: 0.17, write: 400, ink: RED },
);
// where the nib runs through a line, in its letters' size: the small letters' middle, how far it goes up
// and down (once a letter), and how high it lifts between words
export const NIB = { mid: 0.2, bob: 0.13, hop: 0.25 };

// The quill: how long; the vane's half width (of the length), how much it cups and where its barbs part
// (rows up it, the far side's negative); how much the feather bends; the nib's and the shaft's thickness;
// which way it leans when it writes and when it stands in the inkwell ([across, up, up the paper]);
// Story City's colours
export const QUILL = {
  length: 5.2,
  vane: 0.125,
  cup: 0.12,
  splits: [11, 26, -18],
  bend: 0.06,
  nib: 0.075,
  shaft: [0.06, 0.018],
  write: [0.62, 0.74, -0.26] as [number, number, number],
  rest: [0.4, 1, -0.1] as [number, number, number],
  colors: { vane: "#8a5631", inner: "#b27a47", shaft: "#efe6d6", nib: "#cfd2d6", tip: "#8e949c" },
};
// the inkwell it stands in (Story City's: dark-blue glass, a cream label, a gold lip): where it stands,
// across and up the paper (in winter further over, past the longer words), and how big
export const INKWELL = {
  at: bySeason([6.0, 1.8], [8.1, 1.9]),
  size: 1.35,
  glass: "#2c3552",
  label: "#efe2c4",
  lip: "#c9a24a",
  ink: "#141a2e",
};
// the quill's moves (ms): a moment before it starts, out of the inkwell, over to the first line, on to
// each next line, and back into the inkwell once the world is built; how high it lifts as it goes
export const MOVES = bySeason(
  { wait: 350, out: 280, reach: 450, next: 300, back: 520, dip: 280, lift: 1.3 },
  { wait: 250, out: 280, reach: 500, next: 280, back: 560, dip: 280, lift: 1.3 },
);

// The bell (a desk bell): its base's radius and how high its plunger's foot is when it's up; how far the
// plunger comes up when the world is ready and how far it goes down when it's pressed, how long the
// press takes to hit and holds; once it's rung, when the inkwell starts to go down into the paper with
// its quill and how long it takes to be gone, then when the bell starts to go down and how long it takes
// (ms; the wave starts once the bell is gone); while it waits to be rung, how often it rings itself
// (ms, one ding each time). Its parts' shine (each a matcap's top, middle, underside and the paper's
// light under it); the ring that fills round its base while the world is built and the ring's track
export const BELL = {
  radius: 1.36,
  knob: 1.5,
  rise: 0.3,
  press: 0.3,
  hit: 90,
  hold: 40,
  inkwell: [130, 460],
  sink: [560, 460],
  again: 1600,
  colors: {
    yellow: ["#ffe58a", "#f6c427", "#d8960f", "#f7dc95"],
    black: ["#6a6a72", "#26262b", "#141417", "#6b665c"],
    chrome: ["#fbfcfd", "#9aa1a9", "#40464d", "#efe6d0"],
  },
  ring: "#f2bb59",
  track: "#55555d",
};
// its ding: the note (Hz), each part of the sound ([times the note, how loud, how long it rings in s]),
// the plunger's tap ([its pitch, how loud]), how loud it all is, and how much of that when it rings itself
export const DING = {
  note: 1870,
  partials: [
    [1, 1, 1.8],
    [1.006, 0.7, 1.6],
    [2.44, 0.35, 0.7],
    [4.1, 0.15, 0.35],
  ],
  tap: [3200, 0.5],
  volume: 0.14,
  soft: 0.45,
};
// In winter, sleigh bells jingle with it when the visitor rings it: `hits` tinkles in two shakes, `step`
// apart, the second shake `gap` after the first (s, from `start`), each of the `notes` (Hz) ringing
// `ring` s, as loud as `loud` at most
export const JINGLE = bySeason(null, {
  hits: 10,
  start: 0.03,
  step: 0.05,
  gap: 0.3,
  notes: [3150, 4420, 5930],
  ring: 0.16,
  loud: 0.22,
});
// and its Christmas dress: a sprig of holly lying on its base (where, degrees round from the camera's
// side toward its left; a leaf's length, width and fold; a berry's size; how each leaf lies from the
// berries, [turn from straight out (degrees), how far it tips down]; where the berries sit), and a red
// bow on its collar; the shine of the holly, the berries and the ribbon
export const DRESS = {
  at: 28,
  leaf: [0.62, 0.19, 0.35],
  berry: 0.08,
  leaves: [
    [-50, 0.12],
    [8, 0.22],
    [62, 0.1],
  ],
  berries: [
    [0, 0.07, 0],
    [0.09, 0.05, 0.04],
    [-0.03, 0.05, 0.1],
  ],
  colors: {
    holly: ["#5f9e70", "#1f5a39", "#0f3020", "#3d5f4a"],
    berry: ["#ff9c8c", "#d8292c", "#7e0f15", "#f0baa6"],
    ribbon: ["#ff9696", "#cc2a36", "#83111c", "#efc1b2"],
  },
};

// In winter, snow falls softly over the paper: how many flakes, their colour and the faint blue at their
// rims (so they show on the paper) and size, how fast they fall (a share of the box's height a second,
// and how much faster some fall), how far they sway and drift (map units, and a second), the box over the
// ground the camera sees (its half width as a share of the camera's distance, at least the first, else
// the second times the screen's width over its height; its height as a share of that distance), and how
// long it takes to thin away once the wave sets off (ms); seeded so it falls the same each time
export const PAPER_SNOW = {
  count: 2400,
  color: "#ffffff",
  rim: "#c7d6eb",
  size: 0.36,
  fall: [0.035, 0.03],
  sway: 0.8,
  drift: 0.5,
  reach: [0.55, 0.62],
  height: 0.4,
  fade: 1600,
  seed: 1224,
} as const;

// All of it (words, inkwell, quill and bell) is scaled so it fills `fill` of the screen's width
// (`narrow` of it on a screen taller than it's wide, and `tallest` of its height at most), and the quill
// stays within `swing` of it as it writes
export const FIT = { fill: 0.7, narrow: 0.88, tallest: 0.66, swing: 0.94 };

// The ring fills toward how far on the world is, catching up over `ms` or so: a little at first,
// more once it is being built, all of it once it's there
export const FILLING = { ms: 220, first: 0.06, building: 0.15 };
// Once it's full the plunger comes up over `rise` ms and bobs `bob` up and down every 2π × `bobMs` ms;
// pointed at, the bell grows `grow` and the plunger comes up `hover` more (catching up over `hoverMs`).
// It first rings itself `first` ms on. Each ring runs out from it over `ring.ms`, growing `ring.grow`
export const READY = {
  rise: 520,
  bob: 0.012,
  bobMs: 420,
  hover: 0.04,
  grow: 0.04,
  hoverMs: 90,
  first: 900,
  ring: { ms: 900, grow: 1.9, opacity: 0.6 },
};
// Rung: the wave runs out to the edges of the screen's lower part in `wave.near` ms and on to its top
// corners in `wave.far` more; once all is up it's over `end` ms later
export const PRESSED = {
  wave: { near: 2300, far: 900 },
  end: 250,
};
// the wave goes no further than this from the bell, whatever the screen shows
export const REACH_MOST = 330;

// where the opening is: the words being written, the world being built, the bell ready to be rung,
// the world dropping in, then over
export enum Phase {
  Write = "write",
  Build = "build",
  Ready = "ready",
  Go = "go",
  Done = "done",
}
