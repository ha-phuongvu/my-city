import { DataTexture, FloatType, Matrix4, NearestFilter, RedFormat } from "three";
import { ACROSS, C30, GROUND, SLIDE, WIND_DIR } from "./wind.constants";

// The wind on the map, as in the prototype (its gust(), after bruno-simon.com): gusts are two layers of
// soft noise drifting over the map along the wind, a big slow one and a smaller, quicker one, so
// patches of grass lean over together and roll on across the meadow, then lean back. Each tree and
// plant leans from its foot with the gust where it stands, shaking a little while it's strong, and
// leans back a little where the gust drops below nothing.
//
// The prototype works the gusts out on its picture, so this does too: a spot on the map is first put
// where the picture has it (its proj of the foot: the map's z is its y). The wind blows across the
// picture from left to right, a little downhill (WIND_DIR).
//
// The lean is the prototype's skew of the picture: everything above the foot slides toward the
// screen's right in proportion to its height. In three.js that's a shear along the opening view's
// right on the ground, (1, 0, -1)/√2 for the camera looking down (-1, -1, -1); a height h slides
// tan(lean) × h × √(2/3) along it, which looks the same as the prototype's skew. The wind blows that
// way whichever way the camera has turned since.

// The noise: 64 × 64 random values from -0.5 to 0.5, from the prototype's own seed, so the gusts roll
// over the same spots as on its map
const NOISE = (() => {
  const values = new Float32Array(4096);
  let r = 20231;
  for (let i = 0; i < 4096; i++) {
    r = (r * 16807) % 2147483647;
    values[i] = r / 2147483647 - 0.5;
  }
  return values;
})();

/** Soft noise: the values at the four corners of the square (x, y) is in, blended smoothly between them */
function vnoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const w = fy * fy * (3 - 2 * fy);
  const x0 = xi & 63;
  const y0 = (yi & 63) * 64;
  const x1 = (x0 + 1) & 63;
  const y1 = ((yi + 1) & 63) * 64;
  const a = NOISE[y0 + x0];
  const b = NOISE[y0 + x1];
  const c = NOISE[y1 + x0];
  const d = NOISE[y1 + x1];
  return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
}

/** Where the prototype's picture has the spot (x, z) on the map's ground: [across, down] */
function picture(x: number, z: number): [number, number] {
  return [(x - z) * C30, (x + z) / 2 - GROUND];
}

/**
 * The gust at (x, z) on the map at time t (seconds), about -1 to 1: plus leans the way the wind
 * blows. Down the picture counts double, so a gust is as deep as it is wide on the ground.
 */
export function gust(x: number, z: number, t: number): number {
  const [px, py] = picture(x, z);
  const Y = py * 2;
  return (
    vnoise(px * 0.16 - t * 0.5 * WIND_DIR[0], Y * 0.16 - t * 0.5 * WIND_DIR[1]) +
    vnoise(px * 0.06 - t * 0.12 * WIND_DIR[0] + 17.3, Y * 0.06 - t * 0.12 * WIND_DIR[1] + 5.1)
  );
}

/** How far, in degrees, something with sway `amp` standing at (x, z) leans at time t (a little the other way when the gust drops) */
export function leanAt(amp: number, x: number, z: number, t: number): number {
  const g = gust(x, z, t);
  return amp * (0.3 + 2.4 * g + 0.6 * Math.abs(g) * Math.sin(t * 7.5 + picture(x, z)[0] * 1.7));
}

/** How far a point `height` above the foot slides toward the screen's right for a lean of `degrees` */
export function slideFor(degrees: number, height: number): [number, number] {
  const slide = Math.tan((degrees * Math.PI) / 180) * SLIDE * height;
  return [slide * ACROSS, -slide * ACROSS];
}

/** The lean as a matrix: a shear of everything above the foot (y 0) toward the screen's right */
export function leanMatrix(degrees: number, out = new Matrix4()): Matrix4 {
  const [dx, dz] = slideFor(degrees, 1);
  return out.set(1, dx, 0, 0, 0, 1, 0, 0, 0, dz, 1, 0, 0, 0, 0, 1);
}

let noiseTexture: DataTexture | undefined;

/** The noise as a 64 × 64 texture, for the shaders' gusts: pass it as their `windNoise` uniform */
export function windNoise(): DataTexture {
  if (!noiseTexture) {
    noiseTexture = new DataTexture(NOISE, 64, 64, RedFormat, FloatType);
    noiseTexture.minFilter = NearestFilter;
    noiseTexture.magFilter = NearestFilter;
    noiseTexture.needsUpdate = true;
  }
  return noiseTexture;
}

/**
 * The gusts in a shader, the same as gust() above: `windPicture` puts a spot on the map (x, z) where
 * the prototype's picture has it, and `windGust` is the gust there at time t. Needs the `windNoise`
 * texture as its uniform.
 */
export const WIND_GUST_GLSL = /* glsl */ `
uniform sampler2D windNoise;
float windNoiseAt(float x, float y) {
  return texelFetch(windNoise, ivec2(int(mod(x, 64.0)), int(mod(y, 64.0))), 0).r;
}
float windSoftNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = windNoiseAt(i.x, i.y);
  float b = windNoiseAt(i.x + 1.0, i.y);
  float c = windNoiseAt(i.x, i.y + 1.0);
  float d = windNoiseAt(i.x + 1.0, i.y + 1.0);
  return a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y;
}
vec2 windPicture(vec2 foot) {
  return vec2((foot.x - foot.y) * ${C30.toFixed(7)}, (foot.x + foot.y) * 0.5 - ${GROUND.toFixed(2)});
}
float windGust(vec2 foot, float t) {
  vec2 p = windPicture(foot);
  p.y *= 2.0;
  vec2 dir = vec2(${WIND_DIR[0].toFixed(2)}, ${WIND_DIR[1].toFixed(2)});
  return windSoftNoise(p * 0.16 - t * 0.5 * dir) + windSoftNoise(p * 0.06 - t * 0.12 * dir + vec2(17.3, 5.1));
}
`;

/**
 * The same lean in a vertex shader, for plants drawn many to a mesh: `sway` is the plant's foot (x,
 * z) and its amp, `p.y` the height above the ground. Keep it in step with leanAt() and slideFor().
 * Needs the `windNoise` texture as its uniform.
 */
export const WIND_GLSL = /* glsl */ `
${WIND_GUST_GLSL}
vec3 windLean(vec3 p, vec3 sway, float t) {
  float g = windGust(sway.xy, t);
  float lean = sway.z * (0.3 + 2.4 * g + 0.6 * abs(g) * sin(t * 7.5 + windPicture(sway.xy).x * 1.7));
  float slide = tan(radians(lean)) * ${SLIDE.toFixed(7)} * p.y;
  return vec3(p.x + slide * ${ACROSS.toFixed(7)}, p.y, p.z - slide * ${ACROSS.toFixed(7)});
}
`;
