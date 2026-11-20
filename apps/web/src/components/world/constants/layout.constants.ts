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
// each at its own angle and distance from the fountain; artifact version 1794970156-7cfd, with Music
// City over the river, Game City out on the far left above the pond and Comic City out at the top
// left). Story City and Music City are open. Each symbol's place, turn and height make its GLB (turned
// by CARD_YAW) fall exactly on the symbol the prototype draws: like the rest of its city, 1.35 times
// the size the map first had it (its CITY_GROW), so each city stands out from the countryside.
export const CITIES: City[] = [
  {
    id: "story",
    open: true,
    center: [-11.95, -11.95],
    symbol: {
      model: "book",
      position: [-12.0998, 5.3514, -10.9159],
      quaternion: [-0.3087, -0.3768, 0.1895, 0.8525],
      height: 7.9947,
    },
    shadow: { center: [-11.3425, -11.815], radius: 3.132 },
  },
  {
    id: "music",
    open: true,
    center: [-14.91, -35.837],
    symbol: {
      model: "piano",
      // it floats 4.05 back from the middle of the lawn (away from the camera), behind the music stand, the
      // tree and the flower bed on the front of the lawn (the prototype's SYM_BACK)
      position: [-17.7856, 6.0426, -38.5136],
      quaternion: [0, -0.342, 0, 0.9397],
      height: 8.0352,
      // its bench, on the floor the piano's legs stand on, close in front of the keys, as big as the
      // piano (the prototype's pianoSeat: the card's bench turned 175 degrees and scaled 2.73, grown
      // with the city)
      carries: [{ model: "bench", offset: [3.987, -4.0176, 3.3892], yaw: -3.0543, scale: 3.6855 }],
    },
    shadow: { center: [-17.1658, -38.5667], radius: 3.348 },
  },
  {
    id: "movie",
    open: false,
    center: [22.186, -0.775],
    symbol: {
      model: "film-reel",
      position: [22.6923, 6.4989, -1.616],
      quaternion: [0, 0, 0, 1],
      height: 8.8789,
    },
    shadow: { center: [22.7935, -0.64], radius: 2.7 },
  },
  {
    id: "game",
    open: false,
    center: [-28.56, 24.557],
    symbol: {
      model: "kendama",
      position: [-28.562, 8.289, 24.537],
      quaternion: [-0.0247, 0, -0.0247, 0.9994],
      height: 12.5456,
    },
    shadow: { center: [-27.9525, 24.692], radius: 2.592 },
  },
  {
    id: "comic",
    open: false,
    center: [-47.856, -3.741],
    symbol: {
      model: "kamishibai",
      position: [-46.9562, 5.4365, -3.1786],
      quaternion: [0, 0.1132, 0, 0.9936],
      height: 6.1344,
    },
    shadow: { center: [-47.2485, -3.606], radius: 2.592 },
  },
];
