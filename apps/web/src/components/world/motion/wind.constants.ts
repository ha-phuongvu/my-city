// The fixed numbers wind.ts works with: the wind's way, how far each kind of plant leans, and the picture's angles.

/** Which way the wind blows on the prototype's picture: from left to right, a little downhill */
export const WIND_DIR = [0.97, 0.24] as const;

// How far each kind leans, in degrees (buildWorld's amp for each): a gust leans it up to 2.7 times that
export const SWAY = {
  leafy: 1.6,
  round: 1.8,
  apple: 1.8,
  pine: 1.3,
  /** the big bushes out in the grass */
  bush: 1.2,
  /** the bushes and hydrangeas in the city gardens */
  garden: 1.1,
} as const;

export const C30 = Math.cos(Math.PI / 6);
// the map's ground in the prototype's units, where the plants' feet are
export const GROUND = 0.15;
export const ACROSS = Math.SQRT1_2;
export const SLIDE = Math.sqrt(2 / 3);
