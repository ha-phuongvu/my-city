// The fixed numbers outskirts.ts works with: how thick the outskirts' grass, flowers and woods grow,
// and how far out.

// one seed, so the outskirts grow the same every time
export const SEED = 1117;

// The grass grows as thick as the prototype's (6.8 blades to a unit square) out to `full` from the
// fountain, thinning to `far` by `edge`, and none past it: by then the haze has the ground
export const GRASS = { full: 70, edge: 140, near: 6.8, far: 0.8 };
// a wild flower in the grass for every so many blades, as in the prototype's meadow (881 to 67,591)
export const FLOWER_SHARE = 881 / 67591;

// The woods: a tree may stand on a grid `spacing` apart, moved up to `jitter` of that either way.
// Where the groves are (a noise `grove` across, its value over `thick`) every spot has a tree; out
// in the open one in `lone` does. Pines grow together where the pine noise is over `pines`. No tree
// stands past `edge`
export const WOODS = {
  spacing: 5.2,
  jitter: 0.4,
  grove: 26,
  thick: 0.59,
  lone: 0.08,
  pines: 0.6,
  edge: 130,
};
// the round trees' and pines' sizes (the prototype's, before Foliage grows them), and the round
// trees' two leaf colours, the lighter one more often
export const ROUND_SIZE = [2.15, 2.95] as const;
export const PINE_SIZE = [2.2, 2.9] as const;
export const ROUND_COLORS = ["#568f52", "#568f52", "#3d6e48"];
// how often a round tree is an apple tree instead (a copy of one of the map's, apples and all): now
// and then in a grove, more often standing out on its own
export const APPLES = { grove: 0.15, lone: 0.4 };
// how often a spot in a grove holds a clump of big bushes instead: three together, as the
// prototype's are, one a little bigger, the other two beside it
export const BUSHES = {
  share: 0.12,
  clump: [
    [0, 0, 1],
    [1.7, 0.8, 0.85],
    [-1, 1.6, 0.75],
  ] as const,
};
export const BUSH_COLORS = ["#568f52", "#a6c96c"];

// The patches of field flowers: a spot every `spacing` may have one (one in `share` do), as far as
// `edge`, a step clear of the trees; each a copy of one of the prototype's (a big patch and two small ones)
export const PATCHES = { spacing: 12, share: 0.6, edge: 120, clear: 3.5 };

// The meadow painted in soft patches, as the prototype paints its own (the colours its ground model
// carries): big ones of lighter and darker grass, `size` across, one in each `spacing` square or so,
// and many smaller ones over them, a little squashed one way, in sunlit yellow-green, fresh green and
// deeper green (the share of each), as far as `edge`
export const MEADOW_PATCHES = {
  big: { spacing: 26, size: [4, 9] as const, colors: ["#b0c67c", "#8cb16a"] },
  small: {
    spacing: 10,
    size: [2, 7] as const,
    squash: 0.7,
    colors: ["#abc479", "#95bb6e", "#8fb36a"],
    share: [0.4, 0.3, 0.3],
  },
  edge: 165,
  // they lie just over the ground, the small ones over the big
  lift: [0.003, 0.004] as const,
};
