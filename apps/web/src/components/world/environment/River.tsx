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

// The river flowing, as on the prototype's world map (its fx-river): five pale streaks drift down the
// water, the middle one fastest. They are drawn as the prototype draws them on its picture: each is a
// dashed line 0.055 wide (white, half opaque) running along the river a little way out from its middle,
// wobbling gently from side to side, whose dashes slide one whole pattern (3.2) downstream every 2.6 to
// 3.9 seconds. They lie on a strip just over the water, the water's own width, so they keep to it, and
// whatever stands over the river (the bridge, the trees) hides them. With less motion they hold still.

const VERTEX = /* glsl */ `
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

const FRAGMENT = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform float uLanes[${LANES.length}];
  uniform vec4 uDashes[${LANES.length}];
  uniform float uPairs[${LANES.length}];
  uniform float uShift[${LANES.length}];
  // how far along the river this spot is (on the picture), how far out from its middle (on the ground),
  // the river's point number here, and how long a step across the river is on the picture
  varying float vAlong;
  varying float vAcross;
  varying float vPoint;
  varying float vScale;

  // how far along the line u is from a dash running from a to b, the pattern repeating every PATTERN
  float offDash(float u, float a, float b) {
    float d = abs(mod(u - 0.5 * (a + b) + ${(PATTERN / 2).toFixed(2)}, ${PATTERN.toFixed(1)}) - ${(PATTERN / 2).toFixed(2)});
    return max(d - 0.5 * (b - a), 0.0);
  }

  // how much of a line w wide covers this spot, d from its middle (smoothed over a pixel)
  float cover(float d, float w) {
    return clamp((0.5 * w - d) / max(fwidth(d), 1e-5) + 0.5, 0.0, 1.0);
  }

  void main() {
    float keep = 1.0;
    for (int i = 0; i < ${LANES.length}; i++) {
      // the streak's line here, wobbling about its place, and how far this spot is from it on the picture
      float out_ = uLanes[i] + ${WOBBLE.size.toFixed(2)} * sin(vPoint * ${WOBBLE.along.toFixed(2)} + uLanes[i] * ${WOBBLE.across.toFixed(1)});
      float off = abs(vAcross - out_) * vScale;
      // the dashes have slid uShift downstream; their ends are round
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

/** The streak strip along the river: each of its points with the water's two edges either side */
function strip(): BufferGeometry {
  const n = RIVER.length;
  const position = new Float32Array(n * 6);
  const along = new Float32Array(n * 2);
  const across = new Float32Array(n * 2);
  const point = new Float32Array(n * 2);
  const scale = new Float32Array(n * 2);
  let run = 0;
  RIVER.forEach(([x, z], j) => {
    // the way downstream here (from the point before to the one after), and the way out to its left
    const [ax, az] = RIVER[Math.max(0, j - 1)];
    const [bx, bz] = RIVER[Math.min(n - 1, j + 1)];
    const length = Math.hypot(bx - ax, bz - az) || 1;
    const [tx, tz] = [(bx - ax) / length, (bz - az) / length];
    const [nx, nz] = [-tz, tx];
    // how far along the middle it has come, on the picture
    if (j) {
      const [px, pz] = RIVER[j - 1];
      run += Math.hypot((x - px - (z - pz)) * C30, (x - px + (z - pz)) / 2);
    }
    // on the picture, a step across the river is this long, measured square to the streaks
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

/** The river's drifting streaks, on its water */
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
        // it lies just above the water, so it's drawn a little nearer than it is
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
    // each streak at its own speed, each 0.7 s on from the last
    for (let i = 0; i < shift.length; i++)
      shift[i] = PATTERN * (((t + i * STAGGER) / DRIFT[i]) % 1);
  });
  return <mesh ref={water} geometry={geometry} material={material} />;
}
