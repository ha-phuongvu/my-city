// The fixed numbers WorldCanvas.tsx works with: the camera's frame, its limits and the haze.

// The ground the prototype's map frames, which sets how far the camera may zoom out (its view,
// [-56.5, -42, 86, 58.5] on its picture, × √(2/3)): its middle, and how much shows across and down the
// screen. It reaches out left to Game City and Comic City and up over the river to Music City, with
// room for their bigger lawns
export const FRAME = {
  center: [-20.394, 0, -4.806] as [number, number, number],
  width: 70.22,
  height: 47.77,
};

// The camera, as the prototype's "Walk around in 3D" view: it sees 35 degrees from the top of the
// screen to the bottom, and things nearer look bigger
export const FOV = 35;
// The prototype draws its map flat, but the camera sees in perspective, so the ground nearest it (Movie
// City at the bottom right) looks bigger than on the map and would reach past the screen's edge: it
// stands this much further back than the frames alone need
export const FIT_ROOM = 1.2;
// Where the camera stands when the site opens: looking at the ground between the World Plaza and
// Story City (`center`, x and z), from the same side as the map (`turn`, round the up axis), tilted
// `tilt` down from straight overhead, `distance` away on a screen `aspect` wide to 1 tall (further on
// a narrower screen, so as much shows across it)
export const OPENING = {
  center: [-14, -9.5] as [number, number],
  turn: Math.PI / 4 + 0.2,
  tilt: 1.08,
  distance: 54,
  aspect: 1.75,
};
export const HALF_FOV = Math.tan(((FOV / 2) * Math.PI) / 180);
// how far it tilts down from straight overhead (from nearly straight down to nearly level), how near
// and far it may ever stand from the spot it looks at, how far that spot may go from the fountain, and
// how high it stays at least (treetop height) when tilted right down
export const TILT = [0.1, 1.45] as const;
export const REACH = [7, 170] as const;
// How far out it zooms, as the prototype's "Zoomed out" view: until it shows the reference picture of
// the whole map (all five cities and the river: its OUT_VIEW, [-61.5, -44, 107, 63] on its
// picture, × √(2/3)), fitted to the screen the way FRAME is; but on a tall screen, where
// that would be mostly empty grass, no further than to show 1 / 0.66 of what the opening view shows
export const OUT_FRAME = { width: 87.37, height: 51.44 };
export const OUT_FLOOR = 0.66;
// how far from the fountain the spot it looks at may go: into the outskirts' woods, which end 130 out
export const ROAM = 110;
export const CAM_Y = 4.5;
// The haze: things fade into the sky's colour along the horizon from 90 away to 330, and the sky is a
// dome this big round the camera
export const FOG = [90, 330] as const;
export const DOME = 1500;
