// Where the scenery models stand on the world map, as the current prototype's buildWorld() puts them
// (scratchpad anim/props.js). Each is its card's own GLB, moved, turned (about the up axis, radians)
// and scaled to fall exactly on the shapes the prototype draws there. The bunting, film strip, flower
// beds and stone bridge are built from the map's own copies, which differ from their cards, so they
// stand as they are. `fade` is how far the prototype fades a model toward the paper in a city that
// isn't open yet.

export type SceneryPlacement = {
  model: string;
  position: [number, number, number];
  yaw: number;
  scale: number;
  fade: number;
};

export const SCENERY: SceneryPlacement[] = [
  // Game City
  { model: "bunting", position: [2.2298, 0.035, 17.3793], yaw: 0, scale: 1, fade: 0.1 },
  { model: "toy-blocks", position: [3.9558, 0.0327, 21.5118], yaw: 0, scale: 1.8, fade: 0.1 },
  // Music City
  // (its bench floats with the piano: layout.ts, the music symbol's `carries`; its five flower beds
  // grow when the city is pointed at: models/FlowerBeds.tsx, plant by plant from bedLayout.ts)
  { model: "flower-bed", position: [0.4774, 0, -21.6206], yaw: 0, scale: 1, fade: 0.1 },
  // Movie City
  { model: "film-strip", position: [19.8325, -0.0229, -0.5299], yaw: 0, scale: 1, fade: 0.1 },
  { model: "camera", position: [24.9903, 0.035, -1.6731], yaw: 0, scale: 1.7, fade: 0.1 },
  { model: "marquee", position: [23.3143, 0.035, 1.7673], yaw: 0, scale: 1.9, fade: 0.1 },
  // the future-city plot
  { model: "blueprint", position: [11.0318, 0.02, 12.9997], yaw: 0, scale: 1.5, fade: 0 },
  { model: "scaffold", position: [13.5737, 0.02, 12.2094], yaw: 0, scale: 1.45, fade: 0 },
  // over the river
  { model: "stone-bridge", position: [-10.8074, 0, -26.1721], yaw: 0, scale: 1, fade: 0 },
];

/** The paper colour the prototype fades the cities that aren't open yet toward (its FADE) */
export const FADE_TO = "#eeece2";
