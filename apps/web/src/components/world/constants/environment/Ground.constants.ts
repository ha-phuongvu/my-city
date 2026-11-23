// The fixed values Ground.tsx works with: the ground model, the meadow's colour and how far it runs on.

import { bySeason } from "../../utils/season";

// (in winter, the winter prototype's: under snow, the lanes trodden, the river and the pond frozen)
export const SRC = bySeason("/models/world-ground.glb", "/models/winter-ground.glb");

/** The colour the meadow is painted (the model's extras), for the background past its edges */
export const MEADOW_PAINTED = bySeason("#9bbc71", "#d9dad6");

// The prototype's meadow ends 90 out, where its picture ends. The camera can tilt down nearly level
// with the ground, and it doesn't shrink what's far away, so the meadow runs on this far past the
// model in plain painted grass: its edge never comes into view, whichever way the camera turns.
export const MEADOW_REACH = 1000;
