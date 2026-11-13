// The fixed numbers Fountain.tsx works with: the falling sheet and its colours, its streaks, foam, drops and rings.

// The falling sheet: it leaves the top bowl's rim (r0, at z0) and lands in the pool (z1) a little
// further out (r1), drifting out as it falls and falling faster and faster
export const FALLS = { z0: 1.86, r0: 0.86, r1: 1.0, z1: 0.775 };
export const DROP = FALLS.z0 - FALLS.z1;
// The sheet's colours: five bands whitening toward its foot, and a paler streak in 14 of its 60
// columns, as in the model
export const BANDS = ["#9ccedc", "#9ccedc", "#a8d4e0", "#b5dae5", "#c9e4ec"];
export const STREAK = "#e2f3f7";
export const COLUMNS = 60;
// The moving streaks: the map runs 17 down the half that faces it, so 35 go round the whole sheet,
// each 0.04 wide in white at 0.7, dashed 0.3, gap 0.07, 0.12, gap 0.07 of its length, the dashes
// sliding that 0.56 of the way down in about 0.95 s
export const STRANDS = 35;
export const STRAND = { width: 0.04, opacity: 0.7, dashes: [0.3, 0.07, 0.12, 0.07], slide: 0.95 };
export const DASH_ROUND = STRAND.dashes.reduce((sum, d) => sum + d, 0);
// The foam ring round the sheet's foot, in two whites, and the white line over it pulsing between
// 0.35 and 0.7 every 1.3 s; the glint along the lip
export const FOAM = { width: 0.11, lift: 0.012, colors: ["#e2f3f7", "#f3fafc"], pieces: 34 };
export const PULSE = { inside: 0.03, outside: 0.06, lift: 0.016, low: 0.35, high: 0.7, time: 1.3 };
export const LIP = { thickness: 0.018, opacity: 0.8 };
// The drops: two at the foot of every third streak, each hopping up 0.22 and to one side as it
// fades, every 0.9 s
export const DROPS = { radius: 0.035, hop: 0.22, sideways: [-0.07, 0.09], time: 0.9, opacity: 0.9 };
// The rings: two across the pool, starting where the water lands (0.69 of their 1.45 reach), 1.6 s
// apart, every 2.6 s, and one across the top bowl from its middle every 2.4 s; white at 0.9 at most
export const RIPPLES = [
  { z: 0.785, reach: 1.45, from: 0.69, time: 2.6, delay: 0 },
  { z: 0.785, reach: 1.45, from: 0.69, time: 2.6, delay: 1.6 },
  { z: 1.888, reach: 0.62, from: 0.15, time: 2.4, delay: 0 },
];
export const RIPPLE = { width: 0.03, opacity: 0.9, segments: 72 };

export const AROUND = 72;
export const DOWN = 16;
export const HOUR = 3600;
