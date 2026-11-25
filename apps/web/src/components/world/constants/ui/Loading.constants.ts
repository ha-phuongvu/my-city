// The fixed values the loading sheet (Loading.tsx, World.tsx) works with.

// While the 3D code downloads (the browser doesn't say how far it has got) the bar creeps toward
// `to`, closing `rate` of the gap every `every` ms; then the 3D files (models, the opening's font)
// fill it from there up to `files`, as they come in; once the bell is drawn it is full
export const CREEP = { to: 0.3, rate: 0.06, every: 120 };
export const FILES_TO = 0.95;
// how many frames the opening draws before the sheet fades away (Loading.css fades it over 450 ms),
// so the bell and the writing are really on screen by then
export const SETTLE_FRAMES = 2;
// the dots after "Loading", hopping one after another
export const DOTS = 3;
