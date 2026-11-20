"use client";

import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  FileLoader,
  type Mesh,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from "three";
import { BLADE, GRASS_TONES, SEGMENTS, SRC, STALK, STEM } from "./constants/Grass.constants";
import { WIND_GUST_GLSL, windNoise } from "./utils/wind";
import { outskirtsGrass } from "./utils/outskirts";
import { ownWave, WAVE_GLSL, WAVE_UNIFORMS } from "./utils/wave";

// The meadow's long soft grass and the wild flowers standing in it, as on the prototype's world map
// (its startGrass): about 40,000 blades and 741 flowers on thin stems, all bending in the wind. Gusts
// roll across the meadow from the left of the screen to the right (utils/wind.ts): where one passes
// the blades lean over together and catch the light, turning a paler green, so patches of light
// grass sweep over it; each blade also has its own lean and shakes a little while the gust is strong.
//
// Where they grow comes from the prototype's buildWorld (scratchpad anim-world/grass.js →
// world-grass.bin); how they bend is the page's own drawing, worked out on the graphics card. Each
// blade is the page's curve, from the root up to its tip, a pixel or so wide on screen however near
// or far it is (and never thinner than the page's 0.06 when seen from far off). They fade into the
// haze with distance like everything else. Past the prototype's meadow the grass and flowers run on
// over the outskirts (outskirts.ts), thinning out into the haze.

// The wind and the bend, as the page works them out for a blade or a stem whose root is at (x, z):
// the spot on the prototype's picture, then the gust passing over it (about -1 to 1)
const WIND = /* glsl */ `
  uniform float uTime;
  uniform vec2 uScreen;
  uniform float uPixels;
  uniform float uLeast;
  uniform float uStill;
  ${WIND_GUST_GLSL}
  ${WAVE_GLSL}
  #include <fog_pars_vertex>
  // the page's still meadow: every blade a little over, nothing moving
  float gustAt(vec2 root) {
    return uStill > 0.5 ? 0.15 : windGust(root, uTime);
  }
  float timeNow() {
    return uStill > 0.5 ? 0.0 : uTime;
  }
  // a spot on the picture (across, down) from the root, back on the map: across the picture runs
  // along the ground toward the opening view's right, cos 30° × √2 picture units to a map unit; up it is up
  vec3 onMap(vec2 root, vec2 q) {
    return vec3(root.x, 0.0, root.y) + vec3(0.70710678, 0.0, -0.70710678) * (q.x / 1.2247449) + vec3(0.0, -q.y, 0.0);
  }
  // the point of a curve from the root (q on the picture, running on along dq), moved to one side of
  // it on screen (side -1 or 1) by half its width: uPixels wide, or uLeast on the map where that's
  // wider, however far off it is
  vec4 widened(vec2 root, vec2 q, vec2 dq, float side) {
    vec4 view = modelViewMatrix * vec4(onMap(root, q), 1.0);
    vec4 clip = projectionMatrix * view;
    vec4 along = projectionMatrix * modelViewMatrix * vec4(onMap(vec2(0.0), dq), 0.0);
    // which way the curve runs on screen, in pixels, and square to it on its right, so the strip
    // always faces the camera, whichever way the blade points on screen
    vec2 run = (along.xy * clip.w - clip.xy * along.w) * uScreen;
    vec2 across = dot(run, run) > 1e-12 ? normalize(vec2(run.y, -run.x)) : vec2(1.0, 0.0);
    // how many pixels a map unit is, this far off
    float perUnit = projectionMatrix[0][0] * uScreen.x * 0.5 / clip.w;
    float width = max(uPixels, uLeast * perUnit);
    clip.xy += side * across * width / uScreen * clip.w;
    #ifdef USE_FOG
      vFogDepth = -view.z;
    #endif
    return clip;
  }
`;

const BLADE_VERTEX = /* glsl */ `
  attribute float along;
  attribute float side;
  attribute vec2 root;
  attribute vec4 shape; // height, lean, phase, tone
  uniform vec3 uTones[12];
  varying vec3 vColor;
  ${WIND}
  void main() {
    float g = gustAt(root), time = timeNow();
    float own = 0.5 + 0.5 * sin(shape.z * 3.7);
    // the further over it leans, the more light it catches
    float w = 0.25 + 0.5 * (0.45 * own + 0.55 * min(1.0, abs(g) * 1.6));
    float ww = g * g, h = shape.x, lean = shape.y;
    float bend = h * (0.1 + 0.85 * g) + h * (0.02 + 0.06 * abs(g)) * sin(time * 2.4 + shape.z);
    vec2 control = vec2(lean * h * 0.3 + bend * 0.15, -0.62 * h);
    vec2 tip = vec2(lean * h + bend, -h * (1.0 - 0.12 * ww));
    float t = along;
    vec2 q = 2.0 * (1.0 - t) * t * control + t * t * tip;
    vec2 dq = 2.0 * (1.0 - 2.0 * t) * control + 2.0 * t * tip;
    // (lying flat on the paper until the opening's wave comes)
    gl_Position = widened(root, q * waveRise(root), dq, side);
    vWaveGround = root;
    vColor = uTones[int(shape.w) * 4 + int(min(3.0, floor(w * 4.0)))];
  }
`;

const STEM_VERTEX = /* glsl */ `
  attribute float along;
  attribute float side;
  attribute vec2 root;
  attribute vec4 shape; // height, lean, (unused), (unused)
  uniform vec3 uColor;
  varying vec3 vColor;
  ${WIND}
  void main() {
    float g = gustAt(root), time = timeNow();
    float h = shape.x;
    float bend = shape.y + h * (0.06 + 0.6 * g) + h * (0.02 + 0.06 * abs(g)) * sin(time * 1.7 + windPicture(root).x * 3.1);
    vec2 control = vec2(bend * 0.2, -h * 0.6);
    vec2 tip = vec2(bend, -h * (1.0 - 0.12 * g * g));
    float t = along;
    vec2 q = 2.0 * (1.0 - t) * t * control + t * t * tip;
    vec2 dq = 2.0 * (1.0 - 2.0 * t) * control + 2.0 * t * tip;
    // (lying flat on the paper until the opening's wave comes)
    gl_Position = widened(root, q * waveRise(root), dq, side);
    vWaveGround = root;
    vColor = uColor;
  }
`;

// a flower's four blooms: up the top of its stem (a spike) or bunched at its head (a cluster)
const BLOOM_VERTEX = /* glsl */ `
  attribute vec2 corner;
  attribute vec2 root;
  attribute vec4 shape; // height, lean, kind, which bloom (0-3)
  attribute vec3 color;
  varying vec3 vColor;
  varying vec2 vCorner;
  ${WIND}
  void main() {
    float g = gustAt(root), time = timeNow();
    float h = shape.x;
    float bend = shape.y + h * (0.06 + 0.6 * g) + h * (0.02 + 0.06 * abs(g)) * sin(time * 1.7 + windPicture(root).x * 3.1);
    vec2 tip = vec2(bend, -h * (1.0 - 0.12 * g * g));
    int j = int(shape.w);
    vec2 at;
    float r;
    if (shape.z < 0.5) {
      float tt = 0.55 + shape.w * 0.15;
      at = vec2(bend * tt * tt + (mod(shape.w, 2.0) > 0.5 ? 0.017 : -0.017), tip.y * tt);
      r = 0.046 - shape.w * 0.006;
    } else {
      vec2 offsets[4] = vec2[4](vec2(-0.043, 0.006), vec2(0.043, 0.002), vec2(0.0, -0.036), vec2(0.0, 0.016));
      at = tip + offsets[j];
      r = 0.042;
    }
    // a little disc facing the camera, r on the picture (√(2/3) of a map unit each)
    vec4 middle = modelViewMatrix * vec4(onMap(root, at * waveRise(root)), 1.0);
    vWaveGround = root;
    middle.xy += corner * r * 0.81649658;
    gl_Position = projectionMatrix * middle;
    #ifdef USE_FOG
      vFogDepth = -middle.z;
    #endif
    vColor = color;
    vCorner = corner;
  }
`;

const FLAT_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  ${WAVE_GLSL}
  #include <fog_pars_fragment>
  void main() {
    gl_FragColor = vec4(vColor, 1.0);
    #include <colorspace_fragment>
    gl_FragColor.rgb = wavePaint(gl_FragColor.rgb, vWaveGround);
    #include <fog_fragment>
  }
`;

const DISC_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  ${WAVE_GLSL}
  varying vec2 vCorner;
  #include <fog_pars_fragment>
  void main() {
    if (dot(vCorner, vCorner) > 1.0) discard;
    gl_FragColor = vec4(vColor, 1.0);
    #include <colorspace_fragment>
    gl_FragColor.rgb = wavePaint(gl_FragColor.rgb, vWaveGround);
    #include <fog_fragment>
  }
`;

/** A strip from root to tip, SEGMENTS long and two points across, to bend in the shader */
function strip(): InstancedBufferGeometry {
  const geometry = new InstancedBufferGeometry();
  const along: number[] = [];
  const side: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    along.push(i / SEGMENTS, i / SEGMENTS);
    side.push(-1, 1);
    if (i < SEGMENTS) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  geometry.setAttribute("along", new Float32BufferAttribute(along, 1));
  geometry.setAttribute("side", new Float32BufferAttribute(side, 1));
  // three.js wants a position to count the points by; the shader works out where they go
  geometry.setAttribute("position", new Float32BufferAttribute(new Array(along.length * 3).fill(0), 3));
  geometry.setIndex(index);
  return geometry;
}

const linear = (hex: string) => new Color(hex);

type Uniforms = Record<string, { value: unknown }>;

function wind(width: { pixels: number; least: number }, extra: Uniforms = {}): Uniforms {
  return {
    ...UniformsUtils.clone(UniformsLib.fog),
    uTime: { value: 0 },
    uScreen: { value: [1, 1] },
    uPixels: { value: width.pixels },
    uLeast: { value: width.least },
    uStill: { value: 0 },
    windNoise: { value: windNoise() },
    ...WAVE_UNIFORMS,
    ...extra,
  };
}

/** The grass and flowers from world-grass.bin (see grass.js for its layout), and the outskirts' after them */
function parse(data: ArrayBuffer) {
  const head = new DataView(data);
  const blades = head.getUint32(0, true);
  const flowers = head.getUint32(4, true);
  const colours = head.getUint32(8, true);
  const palette = Array.from({ length: colours }, (_, i) => {
    const [r, g, b] = [0, 1, 2].map((k) => head.getUint8(12 + i * 4 + k));
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  });
  const start = 12 + colours * 4;
  const own = { B: new Int16Array(data, start, blades * 6), F: new Int16Array(data, start + blades * 12, flowers * 9) };
  const more = outskirtsGrass(own.B, own.F);
  const B = new Int16Array(own.B.length + more.blades.length);
  B.set(own.B);
  B.set(more.blades, own.B.length);
  const F = new Int16Array(own.F.length + more.flowers.length);
  F.set(own.F);
  F.set(more.flowers, own.F.length);
  return { blades: B.length / 6, flowers: F.length / 9, palette, B, F };
}

export function Grass() {
  const data = useLoader(FileLoader, SRC, (loader) => loader.setResponseType("arraybuffer")) as ArrayBuffer;
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const size = useThree((state) => state.size);
  const dpr = useThree((state) => state.viewport.dpr);
  const meshes = useRef<(Mesh | null)[]>([]);

  const parts = useMemo(() => {
    const { blades, flowers, palette, B, F } = parse(data);
    // the blades
    const grass = strip();
    const root = new Float32Array(blades * 2);
    const shape = new Float32Array(blades * 4);
    for (let i = 0; i < blades; i++) {
      root.set([B[i * 6] / 100, B[i * 6 + 1] / 100], i * 2);
      shape.set([B[i * 6 + 2] / 10000, B[i * 6 + 3] / 10000, B[i * 6 + 4] / 1000, B[i * 6 + 5]], i * 4);
    }
    grass.setAttribute("root", new InstancedBufferAttribute(root, 2));
    grass.setAttribute("shape", new InstancedBufferAttribute(shape, 4));
    grass.instanceCount = blades;
    const grassLook = ownWave(new ShaderMaterial({
      vertexShader: BLADE_VERTEX,
      fragmentShader: FLAT_FRAGMENT,
      fog: true,
      uniforms: wind(BLADE, { uTones: { value: GRASS_TONES.flat().map(linear) } }),
    }));
    // the flowers' stems
    const stems = strip();
    const stemRoot = new Float32Array(flowers * 2);
    const stemShape = new Float32Array(flowers * 4);
    for (let i = 0; i < flowers; i++) {
      stemRoot.set([F[i * 9] / 100, F[i * 9 + 1] / 100], i * 2);
      stemShape.set([F[i * 9 + 2] / 10000, F[i * 9 + 3] / 10000, 0, 0], i * 4);
    }
    stems.setAttribute("root", new InstancedBufferAttribute(stemRoot, 2));
    stems.setAttribute("shape", new InstancedBufferAttribute(stemShape, 4));
    stems.instanceCount = flowers;
    const stemLook = ownWave(new ShaderMaterial({
      vertexShader: STEM_VERTEX,
      fragmentShader: FLAT_FRAGMENT,
      fog: true,
      uniforms: wind(STALK, { uColor: { value: linear(STEM) } }),
    }));
    // and their blooms, four each
    const blooms = new InstancedBufferGeometry();
    blooms.setAttribute("corner", new Float32BufferAttribute([-1, -1, 1, -1, 1, 1, -1, 1], 2));
    blooms.setAttribute("position", new Float32BufferAttribute(new Array(12).fill(0), 3));
    blooms.setIndex([0, 1, 2, 0, 2, 3]);
    const bloomRoot = new Float32Array(flowers * 4 * 2);
    const bloomShape = new Float32Array(flowers * 4 * 4);
    const bloomColor = new Float32Array(flowers * 4 * 3);
    const colours = palette.map(linear);
    for (let i = 0; i < flowers; i++) {
      for (let j = 0; j < 4; j++) {
        const k = i * 4 + j;
        bloomRoot.set([F[i * 9] / 100, F[i * 9 + 1] / 100], k * 2);
        bloomShape.set([F[i * 9 + 2] / 10000, F[i * 9 + 3] / 10000, F[i * 9 + 4], j], k * 4);
        const c = colours[F[i * 9 + 5 + j]] ?? colours[0];
        bloomColor.set([c.r, c.g, c.b], k * 3);
      }
    }
    blooms.setAttribute("root", new InstancedBufferAttribute(bloomRoot, 2));
    blooms.setAttribute("shape", new InstancedBufferAttribute(bloomShape, 4));
    blooms.setAttribute("color", new InstancedBufferAttribute(bloomColor, 3));
    blooms.instanceCount = flowers * 4;
    const bloomLook = ownWave(new ShaderMaterial({
      vertexShader: BLOOM_VERTEX,
      fragmentShader: DISC_FRAGMENT,
      fog: true,
      uniforms: wind(STALK),
    }));
    return [
      { geometry: grass, material: grassLook, pixels: BLADE.pixels },
      { geometry: stems, material: stemLook, pixels: STALK.pixels },
      { geometry: blooms, material: bloomLook, pixels: STALK.pixels },
    ];
  }, [data]);

  useEffect(
    () => () => {
      for (const { geometry, material } of parts) {
        geometry.dispose();
        material.dispose();
      }
    },
    [parts],
  );

  useFrame(({ clock }) => {
    meshes.current.forEach((mesh, i) => {
      if (!mesh) return;
      const u = (mesh.material as ShaderMaterial).uniforms;
      const pixels = parts[i].pixels;
      u.uTime.value = clock.elapsedTime;
      // the page's still meadow: every blade a little over, nothing moving
      u.uStill.value = still ? 1 : 0;
      u.uScreen.value = [size.width * dpr, size.height * dpr];
      u.uPixels.value = pixels * dpr;
    });
  });

  return parts.map(({ geometry, material }, i) => (
    <mesh
      key={i}
      ref={(mesh) => {
        meshes.current[i] = mesh;
      }}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  ));
}
