// The fixed numbers CameraFlash.tsx works with: where the camera's lens is and where its beam reaches,
// the flash's timing, and how big and bright its parts are.

// Movie City's film camera's big lens (the middle of its glass) and the spot its beam of light reaches,
// on the map: the prototype's cameraLens and its flash fx, taken into the site's units as the map is
// ((x, y, z) → (x, z − 0.15, y)), with Movie City grown 1.35 times. The prototype's beam runs on 5.4 to
// [27.1421, 0.6685, 3.5554], drawn over the picture, but in 3D that goes through the city's name board
// standing in front of the camera, so it ends where it meets the board, 3.45 out (0.64 of the way)
export const LENS = [26.2391, 2.1685, -1.5656] as const;
export const AIM = [26.8153, 1.2114, 1.7021] as const;

// As the prototype's .fx-flash: two quick flashes from the lens (a white burst and a four-point glint),
// then the beam of warm light comes up and flickers like a projector's, over 3.4 s. While the city is
// pointed at, the flickering goes round from LOOP[1] back to LOOP[0] (shares of the 3.4 s); once the
// pointer leaves, it all fades out over FADE (s), as the beam's own fade at the end (84% to 100%)
export const FLASH = 3.4;
export const LOOP = [0.3, 0.76] as const;
export const FADE = 0.16 * FLASH;

// the keyframes of each part (fl-glow, fl-star, fl-beam), each at its share of the 3.4 s:
// the burst [share, opacity, size], eased out from each to the next
export const GLOW_KEYS: [number, number, number][] = [
  [0, 0, 0.2],
  [0.03, 1, 1],
  [0.12, 0, 1.25],
  [0.18, 0, 0.2],
  [0.21, 1, 0.9],
  [0.3, 0.35, 0.55],
  [0.86, 0.3, 0.5],
  [1, 0, 0.4],
];
// the glint [share, opacity, turn (degrees, clockwise on the screen), size], eased out from each to the next
export const STAR_KEYS: [number, number, number, number][] = [
  [0, 0, 0, 0.2],
  [0.03, 1, 12, 1],
  [0.1, 0, 30, 0.6],
  [0.18, 0, 0, 0.2],
  [0.21, 1, 14, 0.85],
  [0.29, 0, 32, 0.5],
  [1, 0, 32, 0.5],
];
// the beam [share, opacity], straight from each to the next
export const BEAM_KEYS: [number, number][] = [
  [0, 0],
  [0.22, 0],
  [0.3, 0.85],
  [0.36, 0.6],
  [0.4, 0.9],
  [0.47, 0.7],
  [0.52, 0.88],
  [0.58, 0.62],
  [0.63, 0.86],
  [0.7, 0.68],
  [0.76, 0.8],
  [0.84, 0.55],
  [1, 0],
];

// The burst and the glint are 3.4% of the prototype's map across (about 3 of its picture's units, which
// is about 2.6 of the map's), and stand this far out of the lens toward the viewer, clear of its glass
export const BURST = 2.6;
export const OUT = 0.35;
// the beam: how wide it is at the lens and at its far end, as shares of its length (the prototype's
// clip-path cuts 8% of its height at the lens and all of it at the end, and its height is half its length
// on the screen), and how much it is blurred (its canvas's pixels)
export const BEAM = { near: 0.04, far: 0.45, blur: 3 };
// its colour along it, from the lens to the far end: bright white to a warm gold, fading out
export const BEAM_STOPS: [number, string][] = [
  [0, "rgba(255, 253, 240, 1)"],
  [0.3, "rgba(255, 244, 205, 0.8)"],
  [0.7, "rgba(255, 236, 180, 0.4)"],
  [1, "rgba(255, 230, 160, 0)"],
];
// the burst's colour out from its middle (shares of the square's half-diagonal, as CSS's radial-gradient)
export const GLOW_STOPS: [number, string][] = [
  [0, "#ffffff"],
  [0.14, "rgba(255, 252, 238, 0.95)"],
  [0.38, "rgba(255, 236, 180, 0.45)"],
  [0.7, "rgba(255, 230, 160, 0)"],
];
// the glint's two crossed rays: how thick each is, as a share of the square
export const RAY = 0.06;
