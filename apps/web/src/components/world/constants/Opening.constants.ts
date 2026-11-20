// The fixed numbers Opening.tsx works with, as the prototype's opening (its OPENING).

// the words' font: Dancing Script Bold (OFL 1.1), each line of the welcome set whole as one "letter"
// ("1", "2"), with where each word's ink starts and ends across it and how many letters it has
export const FONT = "/fonts/welcome-hand.typeface.json";

// The words, written on the paper in Story City's dark-blue ink. Each line is a line of the font: how
// big, where its baseline starts (across the paper from the bell, and up it) and how long the quill
// takes to write it (ms). The writing is stretched up the paper by `stand` so it reads upright from the
// camera, leans `slant` as the font's letters do, and lies `lift` above the paper
export const INK = {
  color: "#26304f",
  lines: [
    { glyph: "1", size: 1.5, at: [-4.6, 5.1], write: 1050 },
    { glyph: "2", size: 2.3, at: [-3.4, 2.9], write: 950 },
  ],
  stand: 1.5,
  slant: 0.2,
  lift: 0.012,
};
// the flourish under them: where it starts and ends across the paper, how far up it, how far it dips
// and rises to its end, how wide it is, and how long it takes to write
export const FLOURISH = { from: -2.3, to: 3.2, at: 2.1, sag: 0.35, rise: 0.3, width: 0.17, write: 400 };
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
// across and up the paper, and how big
export const INKWELL = { at: [6.0, 1.8], size: 1.35, glass: "#2c3552", label: "#efe2c4", lip: "#c9a24a", ink: "#141a2e" };
// the quill's moves (ms): a moment before it starts, out of the inkwell, over to the first line, on to
// each next line, and back into the inkwell once the world is built; how high it lifts as it goes
export const MOVES = { wait: 350, out: 280, reach: 450, next: 300, back: 520, dip: 280, lift: 1.3 };

// The bell (a desk bell): its base's radius and how high its plunger's foot is when it's up; how far the
// plunger comes up when the world is ready and how far it goes down when it's pressed, how long the
// press takes to hit and holds; once it's rung, when it starts to go down into the paper and how long
// it takes to be gone (ms; the wave starts then); while it waits to be rung, how often it rings itself
// (ms, one ding each time). Its parts' shine (each a matcap's top, middle, underside and the paper's
// light under it); the ring that fills round its base while the world is built and the ring's track
export const BELL = {
  radius: 1.36,
  knob: 1.5,
  rise: 0.3,
  press: 0.3,
  hit: 90,
  hold: 40,
  sink: [380, 480],
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
// corners in `wave.far` more; the inkwell hops off as it passes, over `hop.ms`; once all is up it's
// over `end` ms later
export const PRESSED = {
  wave: { near: 2300, far: 900 },
  hop: { ms: 600, height: 1.8, turn: 1.1 },
  end: 250,
};
// the wave goes no further than this from the bell, whatever the screen shows
export const REACH_MOST = 330;
