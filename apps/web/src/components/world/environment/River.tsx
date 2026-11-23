"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  type Mesh,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from "three";
import { C30 } from "../constants/wind.constants";
import { useStill } from "../utils/pointing";
import {
  DASHES,
  DRIFT,
  LANES,
  LIFT,
  LINE,
  PATTERN,
  STAGGER,
  WIDTH,
  WOBBLE,
} from "../constants/environment/River.constants";
import { RIVER } from "../constants/environment/riverLayout.constants";

const VERTEX = `
  #include <common>
  #include <fog_pars_vertex>
  attribute float aAlong;
  attribute float aAcross;
  attribute float aPoint;
  attribute float aScale;
  varying float vAlong;
  varying float vAcross;
  varying float vPoint;
  varying float vScale;
  void main() {
    vAlong = aAlong;
    vAcross = aAcross;
    vPoint = aPoint;
    vScale = aScale;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENT = `
  #include <common>
  #include <fog_pars_fragment>
  uniform float uLanes[${LANES.length}];
  uniform vec4 uDashes[${LANES.length}];
  uniform float uPairs[${LANES.length}];
  uniform float uShift[${LANES.length}];
  varying float vAlong;
  varying float vAcross;
  varying float vPoint;
  varying float vScale;

  float offDash(float u, float a, float b) {
    float d = abs(mod(u - 0.5 * (a + b) + ${(PATTERN / 2).toFixed(2)}, ${PATTERN.toFixed(1)}) - ${(PATTERN / 2).toFixed(2)});
    return max(d - 0.5 * (b - a), 0.0);
  }

  float cover(float d, float w) {
    return clamp((0.5 * w - d) / max(fwidth(d), 1e-5) + 0.5, 0.0, 1.0);
  }

  void main() {
    float keep = 1.0;
    for (int i = 0; i < ${LANES.length}; i++) {
      float out_ = uLanes[i] + ${WOBBLE.size.toFixed(2)} * sin(vPoint * ${WOBBLE.along.toFixed(2)} + uLanes[i] * ${WOBBLE.across.toFixed(1)});
      float off = abs(vAcross - out_) * vScale;
      float u = vAlong - uShift[i];
      vec4 p = uDashes[i];
      float gap = offDash(u, 0.0, p.x);
      if (uPairs[i] > 1.5) gap = min(gap, offDash(u, p.x + p.y, p.x + p.y + p.z));
      keep *= 1.0 - ${LINE.opacity.toFixed(2)} * cover(length(vec2(gap, off)), ${LINE.width.toFixed(3)});
    }
    float alpha = 1.0 - keep;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function strip(): BufferGeometry {
  const n = RIVER.length;
  const position = new Float32Array(n * 6);
  const along = new Float32Array(n * 2);
  const across = new Float32Array(n * 2);
  const point = new Float32Array(n * 2);
  const scale = new Float32Array(n * 2);
  let run = 0;
  RIVER.forEach(([x, z], j) => {
    const [ax, az] = RIVER[Math.max(0, j - 1)];
    const [bx, bz] = RIVER[Math.min(n - 1, j + 1)];
    const length = Math.hypot(bx - ax, bz - az) || 1;
    const [tx, tz] = [(bx - ax) / length, (bz - az) / length];
    const [nx, nz] = [-tz, tx];

    if (j) {
      const [px, pz] = RIVER[j - 1];
      run += Math.hypot((x - px - (z - pz)) * C30, (x - px + (z - pz)) / 2);
    }

    const step = C30 / Math.hypot((tx - tz) * C30, (tx + tz) / 2);
    for (const side of [1, -1]) {
      const k = 2 * j + (side > 0 ? 0 : 1);
      position.set([x + (side * nx * WIDTH) / 2, LIFT, z + (side * nz * WIDTH) / 2], 3 * k);
      along[k] = run;
      across[k] = (side * WIDTH) / 2;
      point[k] = j;
      scale[k] = step;
    }
  });
  const index: number[] = [];
  for (let j = 0; j + 1 < n; j++)
    index.push(2 * j, 2 * j + 1, 2 * j + 2, 2 * j + 1, 2 * j + 3, 2 * j + 2);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(position, 3));
  g.setAttribute("aAlong", new BufferAttribute(along, 1));
  g.setAttribute("aAcross", new BufferAttribute(across, 1));
  g.setAttribute("aPoint", new BufferAttribute(point, 1));
  g.setAttribute("aScale", new BufferAttribute(scale, 1));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

export function River() {
  const still = useStill();
  const geometry = useMemo(() => strip(), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          {
            uLanes: { value: LANES },
            uDashes: { value: DASHES.map(([a, b, c = 0, d = 0]) => [a, b, c, d]).flat() },
            uPairs: { value: DASHES.map((d) => d.length / 2) },
            uShift: { value: LANES.map(() => 0) },
          },
        ]),
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        fog: true,

        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -4,
      }),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  const water = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const look = water.current?.material as ShaderMaterial | undefined;
    if (still || !look) return;
    const t = clock.elapsedTime;
    const shift = look.uniforms.uShift.value as number[];

    for (let i = 0; i < shift.length; i++)
      shift[i] = PATTERN * (((t + i * STAGGER) / DRIFT[i]) % 1);
  });
  return <mesh ref={water} geometry={geometry} material={material} />;
}
