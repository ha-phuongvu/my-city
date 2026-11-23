// In winter no wild flowers grow on the map: where they would, the snow has drifted into piles (the
// winter prototype's snowPile, artifact version 1795424148-535d). Pointed at (or tapped), only that pile
// shows how it came: snow falling on the bare ground, then piling up little by little till it's whole.

// every pile, generated from the prototype's buildWorld: [x, z, how far it reaches across x and z, its
// seed (its own lumps and humps), the space of wild flowers it lies in]
export const PILES: [x: number, z: number, rx: number, rz: number, seed: number, space: number][] =
  [
    [-33.433, 6.492, 0.461, 0.345, 0, 1],
    [-34.159, 3.328, 0.962, 0.755, 1, 1],
    [-31.579, 4.412, 1.004, 0.832, 2, 1],
    [-12.65, 9.942, 0.639, 0.633, 3, 2],
    [-10.066, 7.692, 0.99, 1.003, 4, 2],
    [-1.921, -37.254, 1.66, 1.157, 5, 3],
    [19.243, -16.712, 1.773, 1.773, 6, 4],
    [16.763, -19.846, 1.086, 1.052, 7, 4],
    [10.6, 4.044, 1.05, 0.749, 8, 5],
    [13.398, 3.547, 0.701, 0.931, 9, 5],
    [22.878, 18.019, 0.598, 0.586, 10, 6],
    [19.715, 15.799, 0.377, 0.487, 11, 6],
    [4.1, 31.981, 1.98, 1.435, 12, 7],
    [6.323, 34.841, 0.552, 0.475, 13, 7],
    [4.539, 34.913, 0.543, 0.543, 14, 7],
    [35.887, -0.703, 1.8, 1.98, 15, 8],
    [30.626, -20.484, 0.713, 0.684, 16, 9],
    [28.99, -23.963, 0.539, 0.648, 17, 9],
    [-54.391, 3.79, 1.296, 1.745, 18, 10],
    [-58.156, 5.427, 0.501, 0.527, 19, 10],
    [12.75, 34.016, 0.532, 0.433, 20, 11],
    [10.859, 31.844, 0.493, 0.454, 21, 11],
    [10.159, 34.134, 0.56, 0.575, 22, 11],
    [32.733, 13.71, 0.735, 0.504, 23, 12],
    [32.622, 9.944, 1.98, 1.626, 24, 12],
    [34.674, 12.068, 0.449, 0.323, 25, 12],
  ];

// A pile's shape: a lumpy dome rx by rz, `high` tall plus `tall` of its narrower side (each a little
// taller or lower than that), its edge wavering, one to `humps` humps on it, drawn in `rings` rings of
// `segs` corners; and a bluer drift lying round its foot, `spread` as wide; their colours. Piling up it
// is `least` of its width at first
export const PILE = {
  high: 0.3,
  tall: 0.55,
  rings: 8,
  segs: 32,
  humps: 4,
  color: "#eef2f7",
  drift: "#d3dde8",
  spread: 1.12,
  least: 0.45,
};
// the seed each pile's shape is drawn from: BASE plus STEP for each pile
export const SHAPE_SEED = { base: 9100, step: 173 };

// Pointed at: how long the snow falls on the bare ground before it starts to pile up, and how long it
// takes to pile up whole (s)
export const PILE_UP = { wait: 0.7, grow: 3.4 };

// how high over the ground pointing at a pile still counts, and how much wider than the pile
export const HIT = { high: 0.5, wide: 1.1 };
// the drift lies this little over the ground, so it doesn't flicker into it
export const DRIFT_LIFT = 0.004;
