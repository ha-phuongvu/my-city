// The fixed numbers wave.ts works with: the paper the world lies flat on before it opens, and the
// wave that grows it up out of it.

// the blank sheet's colour, as on the page
export const PAPER = "#f4eddc";
// The wave: `width` deep (the world rises over that much as it passes, and takes its colours over
// about half of it), with a warm glow along its front
export const WAVE = { width: 6, glow: "#ffe2a0" };
// where the ground is: everything lies flat down onto it
export const GROUND_Y = 0;

// In winter snow lies on whatever stands in the world, thicker the flatter it faces up (`from` to
// `to` of the way up, `most` at most), from the shadow's blue to the lit white (the winter
// prototype's snowOn, which it paints on every corner of what stands above the ground)
export const SNOW = { light: "#fbfcff", shade: "#c6d3e3", from: 0.3, to: 0.75, most: 0.95 };
