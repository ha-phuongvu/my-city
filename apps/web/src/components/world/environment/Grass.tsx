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
import {
  BLADE,
  GRASS_TONES,
  SEGMENTS,
  SNOW,
  SRC,
  STALK,
  STEM,
} from "../constants/environment/Grass.constants";
import { WIND_GUST_GLSL, windNoise } from "../utils/wind";
import { outskirtsGrass } from "../utils/outskirts";
import { ownWave, WAVE_GLSL, WAVE_UNIFORMS } from "../utils/wave";

const WIND = `
  uniform float uTime;
  uniform vec2 uScreen;
  uniform float uPixels;
  uniform float uLeast;
  uniform float uStill;
  ${WIND_GUST_GLSL}
  ${WAVE_GLSL}
  #include <fog_pars_vertex>
  float gustAt(vec2 root) {
    return uStill > 0.5 ? 0.15 : windGust(root, uTime);
  }
  float timeNow() {
    return uStill > 0.5 ? 0.0 : uTime;
  }
  vec3 onMap(vec2 root, vec2 q) {
    return vec3(root.x, 0.0, root.y) + vec3(0.70710678, 0.0, -0.70710678) * (q.x / 1.2247449) + vec3(0.0, -q.y, 0.0);
  }
  vec4 widened(vec2 root, vec2 q, vec2 dq, float side) {
    vec4 view = modelViewMatrix * vec4(onMap(root, q), 1.0);
    vec4 clip = projectionMatrix * view;
    vec4 along = projectionMatrix * modelViewMatrix * vec4(onMap(vec2(0.0), dq), 0.0);
    vec2 run = (along.xy * clip.w - clip.xy * along.w) * uScreen;
    vec2 across = dot(run, run) > 1e-12 ? normalize(vec2(run.y, -run.x)) : vec2(1.0, 0.0);
    float perUnit = projectionMatrix[0][0] * uScreen.x * 0.5 / clip.w;
    float width = max(uPixels, uLeast * perUnit);
    clip.xy += side * across * width / uScreen * clip.w;
    #ifdef USE_FOG
      vFogDepth = -view.z;
    #endif
    return clip;
  }
`;

const BLADE_VERTEX = `
  attribute float along;
  attribute float side;
  attribute vec2 root;
  attribute vec4 shape;
  uniform vec3 uTones[12];
  uniform vec3 uRoot;
  varying vec3 vColor;
  ${WIND}
  void main() {
    float g = gustAt(root), time = timeNow();
    float own = 0.5 + 0.5 * sin(shape.z * 3.7);
    float w = 0.25 + 0.5 * (0.45 * own + 0.55 * min(1.0, abs(g) * 1.6));
    float ww = g * g, h = shape.x, lean = shape.y;
    float bend = h * (0.1 + 0.85 * g) + h * (0.02 + 0.06 * abs(g)) * sin(time * 2.4 + shape.z);
    vec2 control = vec2(lean * h * 0.3 + bend * 0.15, -0.62 * h);
    vec2 tip = vec2(lean * h + bend, -h * (1.0 - 0.12 * ww));
    float t = along;
    vec2 q = 2.0 * (1.0 - t) * t * control + t * t * tip;
    vec2 dq = 2.0 * (1.0 - 2.0 * t) * control + 2.0 * t * tip;
    gl_Position = widened(root, q * waveRise(root), dq, side);
    vWaveGround = root;
    vColor = uTones[int(shape.w) * 4 + int(min(3.0, floor(w * 4.0)))];
    #ifdef SNOW
      vColor = mix(uRoot, vColor, smoothstep(0.0, 0.75, t));
    #endif
  }
`;

const STEM_VERTEX = `
  attribute float along;
  attribute float side;
  attribute vec2 root;
  attribute vec4 shape;
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
    gl_Position = widened(root, q * waveRise(root), dq, side);
    vWaveGround = root;
    vColor = uColor;
  }
`;

const BLOOM_VERTEX = `
  attribute vec2 corner;
  attribute vec2 root;
  attribute vec4 shape;
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

const FLAT_FRAGMENT = `
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

const DISC_FRAGMENT = `
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

  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(new Array(along.length * 3).fill(0), 3),
  );
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
  const own = {
    B: new Int16Array(data, start, blades * 6),
    F: new Int16Array(data, start + blades * 12, flowers * 9),
  };
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
  const data = useLoader(FileLoader, SRC, (loader) =>
    loader.setResponseType("arraybuffer"),
  ) as ArrayBuffer;
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const size = useThree((state) => state.size);
  const dpr = useThree((state) => state.viewport.dpr);
  const meshes = useRef<(Mesh | null)[]>([]);

  const parts = useMemo(() => {
    const { blades, palette, B, F: all } = parse(data);

    const F = SNOW.every > 1 ? all.filter((_, k) => Math.floor(k / 9) % SNOW.every === 0) : all;
    const flowers = F.length / 9;

    const grass = strip();
    const root = new Float32Array(blades * 2);
    const shape = new Float32Array(blades * 4);
    for (let i = 0; i < blades; i++) {
      root.set([B[i * 6] / 100, B[i * 6 + 1] / 100], i * 2);
      shape.set(
        [
          (B[i * 6 + 2] / 10000) * SNOW.height,
          B[i * 6 + 3] / 10000,
          B[i * 6 + 4] / 1000,
          B[i * 6 + 5],
        ],
        i * 4,
      );
    }
    grass.setAttribute("root", new InstancedBufferAttribute(root, 2));
    grass.setAttribute("shape", new InstancedBufferAttribute(shape, 4));
    grass.instanceCount = blades;
    const grassLook = ownWave(
      new ShaderMaterial({
        vertexShader: BLADE_VERTEX,
        fragmentShader: FLAT_FRAGMENT,
        fog: true,
        defines: SNOW.on ? { SNOW: "" } : {},
        uniforms: wind(BLADE, {
          uTones: { value: GRASS_TONES.flat().map(linear) },
          uRoot: { value: linear(SNOW.root) },
        }),
      }),
    );

    const stems = strip();
    const stemRoot = new Float32Array(flowers * 2);
    const stemShape = new Float32Array(flowers * 4);
    for (let i = 0; i < flowers; i++) {
      stemRoot.set([F[i * 9] / 100, F[i * 9 + 1] / 100], i * 2);
      stemShape.set([(F[i * 9 + 2] / 10000) * SNOW.twig, F[i * 9 + 3] / 10000, 0, 0], i * 4);
    }
    stems.setAttribute("root", new InstancedBufferAttribute(stemRoot, 2));
    stems.setAttribute("shape", new InstancedBufferAttribute(stemShape, 4));
    stems.instanceCount = flowers;
    const stemLook = ownWave(
      new ShaderMaterial({
        vertexShader: STEM_VERTEX,
        fragmentShader: FLAT_FRAGMENT,
        fog: true,
        uniforms: wind(STALK, { uColor: { value: linear(STEM) } }),
      }),
    );

    const blooms = new InstancedBufferGeometry();
    blooms.setAttribute("corner", new Float32BufferAttribute([-1, -1, 1, -1, 1, 1, -1, 1], 2));
    blooms.setAttribute("position", new Float32BufferAttribute(new Array(12).fill(0), 3));
    blooms.setIndex([0, 1, 2, 0, 2, 3]);
    const bloomRoot = new Float32Array(flowers * 4 * 2);
    const bloomShape = new Float32Array(flowers * 4 * 4);
    const bloomColor = new Float32Array(flowers * 4 * 3);
    const colours = (SNOW.on ? SNOW.berries : palette).map(linear);
    for (let i = 0; i < flowers; i++) {
      for (let j = 0; j < 4; j++) {
        const k = i * 4 + j;
        bloomRoot.set([F[i * 9] / 100, F[i * 9 + 1] / 100], k * 2);
        bloomShape.set(
          [(F[i * 9 + 2] / 10000) * SNOW.twig, F[i * 9 + 3] / 10000, F[i * 9 + 4], j],
          k * 4,
        );
        const c = colours[F[i * 9 + 5 + j] % colours.length] ?? colours[0];
        bloomColor.set([c.r, c.g, c.b], k * 3);
      }
    }
    blooms.setAttribute("root", new InstancedBufferAttribute(bloomRoot, 2));
    blooms.setAttribute("shape", new InstancedBufferAttribute(bloomShape, 4));
    blooms.setAttribute("color", new InstancedBufferAttribute(bloomColor, 3));
    blooms.instanceCount = flowers * 4;
    const bloomLook = ownWave(
      new ShaderMaterial({
        vertexShader: BLOOM_VERTEX,
        fragmentShader: DISC_FRAGMENT,
        fog: true,
        uniforms: wind(STALK),
      }),
    );
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
