import { DataTexture, FloatType, Matrix4, NearestFilter, RedFormat } from "three";
import { ACROSS, C30, GROUND, SLIDE, WIND_DIR } from "../constants/wind.constants";

const NOISE = (() => {
  const values = new Float32Array(4096);
  let r = 20231;
  for (let i = 0; i < 4096; i++) {
    r = (r * 16807) % 2147483647;
    values[i] = r / 2147483647 - 0.5;
  }
  return values;
})();

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

function picture(x: number, z: number): [number, number] {
  return [(x - z) * C30, (x + z) / 2 - GROUND];
}

export function gust(x: number, z: number, t: number): number {
  const [px, py] = picture(x, z);
  const Y = py * 2;
  return (
    vnoise(px * 0.16 - t * 0.5 * WIND_DIR[0], Y * 0.16 - t * 0.5 * WIND_DIR[1]) +
    vnoise(px * 0.06 - t * 0.12 * WIND_DIR[0] + 17.3, Y * 0.06 - t * 0.12 * WIND_DIR[1] + 5.1)
  );
}

export function leanAt(amp: number, x: number, z: number, t: number): number {
  const g = gust(x, z, t);
  return amp * (0.3 + 2.4 * g + 0.6 * Math.abs(g) * Math.sin(t * 7.5 + picture(x, z)[0] * 1.7));
}

export function slideFor(degrees: number, height: number): [number, number] {
  const slide = Math.tan((degrees * Math.PI) / 180) * SLIDE * height;
  return [slide * ACROSS, -slide * ACROSS];
}

export function leanMatrix(degrees: number, out = new Matrix4()): Matrix4 {
  const [dx, dz] = slideFor(degrees, 1);
  return out.set(1, dx, 0, 0, 0, 1, 0, 0, 0, dz, 1, 0, 0, 0, 0, 1);
}

let noiseTexture: DataTexture | undefined;

export function windNoise(): DataTexture {
  if (!noiseTexture) {
    noiseTexture = new DataTexture(NOISE, 64, 64, RedFormat, FloatType);
    noiseTexture.minFilter = NearestFilter;
    noiseTexture.magFilter = NearestFilter;
    noiseTexture.needsUpdate = true;
  }
  return noiseTexture;
}

export const WIND_GUST_GLSL = `
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

export const WIND_GLSL = `
${WIND_GUST_GLSL}
vec3 windLean(vec3 p, vec3 sway, float t) {
  float g = windGust(sway.xy, t);
  float lean = sway.z * (0.3 + 2.4 * g + 0.6 * abs(g) * sin(t * 7.5 + windPicture(sway.xy).x * 1.7));
  float slide = tan(radians(lean)) * ${SLIDE.toFixed(7)} * p.y;
  return vec3(p.x + slide * ${ACROSS.toFixed(7)}, p.y, p.z - slide * ${ACROSS.toFixed(7)});
}
`;
