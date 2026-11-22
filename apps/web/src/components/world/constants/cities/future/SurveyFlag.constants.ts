// The fixed numbers SurveyFlag.tsx works with: the flags' colours and models, and the cloth and the way it flies.

// the flags' colours (P.red or P.hydBlue, with P.white) and their models
// the two survey flags' colours
export enum FlagColor {
  Red = "red",
  Blue = "blue",
}

export const FLAGS = {
  [FlagColor.Red]: { src: "/models/survey-flag.glb", stripes: ["#b0463f", "#fff6e6"] },
  [FlagColor.Blue]: { src: "/models/survey-flag-blue.glb", stripes: ["#4b9fc0", "#fff6e6"] },
};

// the cloth in the prototype's units (surveyFlag at x = y = 0 on the ground at z 0.15): how long it
// reaches from the pole, how deep it hangs, the height of its top edge, and how wide each stripe is
// across its diagonal
export const CLOTH = { length: 0.8, depth: 0.52, top: 0.15 + 1.75 - 0.06, stripe: 0.2 };
export const R = Math.SQRT1_2;
// it flies along the line (1, -1) away from the pole, and ripples toward and away from (1, 1)
export const ALONG = [R, -R];
export const ACROSS = [R, R];
// points along the cloth and down it, enough for the waves to curve smoothly
export const COLUMNS = 24;
export const ROWS = 8;
