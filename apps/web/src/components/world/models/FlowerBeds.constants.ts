// The fixed numbers FlowerBeds.tsx works with: the growing's timing and stages, the buds' green and the paper.

import { Color, SRGBColorSpace } from "three";
import { FADE_TO } from "../sceneryLayout";

export const GROW = 1.5;
export const CUT = GROW / 12;
export const STAGES = [0, 0.14, 0.28, 0.4, 0.48, 0.56, 0.63, 0.7, 0.77, 0.84, 0.92, 1];
// the green a bud starts out as, before it takes its blossom's colour (in sRGB, as the prototype mixes them)
export const BUD = new Color("#7fae4a").getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
// how high over its foot pointing at a bed still counts (its plants stand about 0.6 tall)
export const HIT_HEIGHT = 0.9;

export const PAPER = new Color(FADE_TO).getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
