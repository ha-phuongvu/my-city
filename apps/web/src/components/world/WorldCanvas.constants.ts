// The fixed numbers WorldCanvas.tsx works with: the camera's frame, its limits and the haze.

// The ground the prototype's map frames (its view, [-27.5, -23.7, 55, 39.4] on its picture, × √(2/3)):
// its middle, and how much shows across and down the screen
export const FRAME = { center: [-3.85, 0, -3.85] as [number, number, number], width: 44.91, height: 32.17 };

// The camera, as the prototype's "Walk around in 3D" view: it sees 35 degrees from the top of the
// screen to the bottom, and things nearer look bigger
export const FOV = 35;
export const HALF_FOV = Math.tan(((FOV / 2) * Math.PI) / 180);
// how far it tilts down from straight overhead (from nearly straight down to nearly level), how near
// and far it may ever stand from the spot it looks at, how far that spot may go from the fountain, and
// how high it stays at least (treetop height) when tilted right down
export const TILT = [0.1, 1.45] as const;
export const REACH = [7, 170] as const;
// How far out it zooms, as the prototype's "Zoomed out" view: until it shows the reference picture of
// the whole map (all five cities and the river along the top: its OUT_VIEW, [-44.38, -24.34, 89.17,
// 42.81] on its picture, × √(2/3)), fitted to the screen the way FRAME is; but on a tall screen, where
// that would be mostly empty grass, no further than to show 1 / 0.66 of what the opening view shows
export const OUT_FRAME = { width: 72.81, height: 34.95 };
export const OUT_FLOOR = 0.66;
export const ROAM = 75;
export const CAM_Y = 4.5;
// The haze: things fade into the sky's colour along the horizon from 90 away to 330, and the sky is a
// dome this big round the camera
export const FOG = [90, 330] as const;
export const DOME = 1500;
