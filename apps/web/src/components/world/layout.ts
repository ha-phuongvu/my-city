// The world map, as laid out in the "My City Map and Models" prototype (its buildWorld(), run to get
// every seeded position). three.js units: x and z on the ground, y up, the fountain at the origin.
// Colors are the prototype's base colors before lighting.

export type XZ = [x: number, z: number];

export type City = {
  id: "story" | "music" | "movie" | "game" | "comic";
  open: boolean;
  center: XZ;
  /** the floating symbol: its model, the centre of its box, its turn on the map and its height */
  symbol: {
    model: string;
    position: [number, number, number];
    quaternion: [number, number, number, number];
    height: number;
    /**
     * models that float along with the symbol, as parts of it in the prototype: each placed from the
     * symbol's position, turned about the up axis (radians) and scaled
     */
    carries?: { model: string; offset: [number, number, number]; yaw: number; scale: number }[];
  };
  /** where the symbol's shadow falls on the ground, and how wide it is */
  shadow: { center: XZ; radius: number };
};

// Five cities round the World Plaza, where the current prototype's world map has them (its CITY_ANGLE:
// each at its own angle and distance from the fountain). Only Story City is open. Each symbol's place,
// turn and height make its GLB (turned by CARD_YAW) fall exactly on the symbol the prototype draws.
export const CITIES: City[] = [
  {
    id: "story",
    open: true,
    center: [-11.95, -11.95],
    symbol: {
      model: "book",
      position: [-12.061, 3.964, -11.184],
      quaternion: [-0.3087, -0.3768, 0.1895, 0.8525],
      height: 5.922,
    },
    shadow: { center: [-11.5, -11.85], radius: 2.32 },
  },
  {
    id: "music",
    open: false,
    center: [0.393, -22.497],
    symbol: {
      model: "piano",
      // it floats 3 back from the middle of the lawn (away from the camera), behind the music stand, the
      // tree and the flower bed on the front of the lawn (the prototype's SYM_BACK)
      position: [-1.7373, 4.476, -24.4793],
      quaternion: [0, -0.342, 0, 0.9397],
      height: 5.952,
      // its bench, on the floor the piano's legs stand on, close in front of the keys, as big as the
      // piano (the prototype's pianoSeat: the card's bench turned 175 degrees and scaled 2.73)
      carries: [{ model: "bench", offset: [2.9533, -2.976, 2.5105], yaw: -3.0543, scale: 2.73 }],
    },
    shadow: { center: [-1.2783, -24.5183], radius: 2.48 },
  },
  {
    id: "movie",
    open: false,
    center: [22.186, -0.775],
    symbol: {
      model: "film-reel",
      position: [22.561, 4.814, -1.398],
      quaternion: [0, 0, 0, 1],
      height: 6.577,
    },
    shadow: { center: [22.636, -0.675], radius: 2 },
  },
  {
    id: "game",
    open: false,
    center: [2.477, 17.627],
    symbol: {
      model: "kendama",
      position: [2.476, 6.14, 17.612],
      quaternion: [-0.0247, 0, -0.0247, 0.9994],
      height: 9.293,
    },
    shadow: { center: [2.927, 17.727], radius: 1.92 },
  },
  {
    id: "comic",
    open: false,
    center: [-22.087, 0.771],
    symbol: {
      model: "kamishibai",
      position: [-21.42, 4.027, 1.188],
      quaternion: [0, 0.1132, 0, 0.9936],
      height: 4.544,
    },
    shadow: { center: [-21.637, 0.871], radius: 1.92 },
  },
];
