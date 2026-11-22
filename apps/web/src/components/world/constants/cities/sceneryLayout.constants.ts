// Where the scenery models stand on the world map, as the current prototype's buildWorld() puts them
// (artifact version 1794970156-7cfd, its cities grown 1.35 times). Each is its card's own GLB, moved,
// turned (about the up axis, radians) and scaled to fall exactly on the shapes the prototype draws there. The bunting, film strip, flower
// beds and stone bridge are built from the map's own copies, which differ from their cards, so they
// stand as they are (the beds each moved out from Music City's middle as their bed in the prototype
// grew with the city: flower-bed.glb's bed nodes). `fade` is how far the prototype fades a model toward
// the paper in a city that isn't open yet.
//
// The toy blocks are the one exception. The prototype's drawing hides its stacking rings behind
// Game City's wall and in front of the green block, but in 3D the rings stood on the wall and went
// through the block. So in toy-blocks.glb the rings stand beside the green block (at 1.16, -0.02 on
// the card, not 0.95, 0.6), and the set stands 0.16 nearer the city's middle, all of it inside the
// wall.

// the scenery GLBs (public/models/<name>.glb)
export enum SceneryModel {
  Bunting = "bunting",
  ToyBlocks = "toy-blocks",
  FlowerBed = "flower-bed",
  FilmStrip = "film-strip",
  Camera = "camera",
  Marquee = "marquee",
  Blueprint = "blueprint",
  Scaffold = "scaffold",
  StoneBridge = "stone-bridge",
}

export type SceneryPlacement = {
  model: SceneryModel;
  position: [number, number, number];
  yaw: number;
  scale: number;
  fade: number;
};

export const SCENERY: SceneryPlacement[] = [
  // Game City
  {
    model: SceneryModel.Bunting,
    position: [-28.8077, 0.035, 24.3095],
    yaw: 0,
    scale: 1,
    fade: 0.05,
  },
  {
    model: SceneryModel.ToyBlocks,
    position: [-26.8242, 0.0327, 29.4748],
    yaw: 0,
    scale: 1.8,
    fade: 0.05,
  },
  // Music City
  // (its bench floats with the piano: layout.ts, the music symbol's `carries`; its five flower beds
  // grow when the city is pointed at: cities/music/FlowerBeds.tsx, plant by plant from bedLayout.ts)
  { model: SceneryModel.FlowerBed, position: [-14.8254, 0, -34.961], yaw: 0, scale: 1, fade: 0 },
  // Movie City
  {
    model: SceneryModel.FilmStrip,
    position: [19.8325, -0.0229, -0.5299],
    yaw: 0,
    scale: 1,
    fade: 0.05,
  },
  {
    model: SceneryModel.Camera,
    position: [25.9802, 0.035, -2.0196],
    yaw: 0,
    scale: 1.7,
    fade: 0.05,
  },
  {
    model: SceneryModel.Marquee,
    position: [23.6855, 0.035, 2.6335],
    yaw: 0,
    scale: 1.9,
    fade: 0.05,
  },
  // the future-city plot
  {
    model: SceneryModel.Blueprint,
    position: [11.0318, 0.02, 12.9997],
    yaw: 0,
    scale: 1.5,
    fade: 0,
  },
  {
    model: SceneryModel.Scaffold,
    position: [13.5737, 0.02, 12.2094],
    yaw: 0,
    scale: 1.45,
    fade: 0,
  },
  // over the river
  { model: SceneryModel.StoneBridge, position: [-10.8074, 0, -26.1721], yaw: 0, scale: 1, fade: 0 },
];

/** The paper colour the prototype fades the cities that aren't open yet toward (its FADE) */
export const FADE_TO = "#eeece2";
