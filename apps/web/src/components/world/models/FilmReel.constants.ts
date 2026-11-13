// The fixed numbers FilmReel.tsx works with: the reel's axle and how far and how fast its holes turn.

export const R = Math.SQRT1_2;
// the axle (mReel's C), and the way the holes go round it, from the reel's right edge up over its top
export const AXLE = { at: [1.5 - R * 0.1, 1.5 - R * 0.1, 2.52], axis: [-R, -R, 0] };
export const STEP = 9;
export const STEP_TIME = 0.11;
export const ROUND = 72;
