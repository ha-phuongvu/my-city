"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  type Mesh,
  ShaderMaterial,
  ShapeUtils,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
} from "three";
import { useStill } from "./utils/pointing";
import { DASHES, LIFT, PATTERN, RING_TIME } from "./constants/Pond.constants";
import { POND_LANES, POND_RINGS, POND_WATER } from "./constants/pondLayout.constants";

// The pond's water flowing, as on the prototype's map (its fx-pond): six pale streaks drift slowly
// along the pond's length, and now and then a soft ring spreads out and fades, four of them in turn,
// all kept to the water. It is drawn on the water as the prototype draws it on its picture: the
// streaks are dashed lines 0.06 wide (white, 0.38 opaque) whose dashes slide one whole pattern (3.5)
// along every 7, 8.6 or 10.2 seconds, and each ring is an ellipse 0.7 by 0.38 that grows from a fifth
// of its size to 1.6 times it while it shows and fades, once every 6.8 seconds. With less motion the
// streaks hold still and there are no rings.

const VERTEX = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  varying vec2 vPicture;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    // the spot on the prototype's picture: its proj of the map point (x, y, z) = (x, the site's z, the site's y + 0.15)
    vPicture = vec2((world.x - world.z) * 0.8660254, (world.x + world.z) * 0.5 - (world.y + 0.15));
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENT = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  // each streak's line: its points on the picture, and how far along the line each one is
  uniform vec3 uLanes[${POND_LANES.length * 13}];
  uniform vec4 uDashes[${POND_LANES.length}];
  uniform float uPairs[${POND_LANES.length}];
  uniform float uShift[${POND_LANES.length}];
  uniform vec2 uRings[${POND_RINGS.length}];
  uniform vec2 uRingNow[${POND_RINGS.length}];
  varying vec2 vPicture;

  // how far along the line u is from a dash running from a to b, the pattern repeating every 3.5
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
    for (int i = 0; i < ${POND_LANES.length}; i++) {
      // the nearest point on the streak's line, and how far along the line it is
      float best = 1e9;
      float along = 0.0;
      for (int j = 0; j < 12; j++) {
        vec3 from = uLanes[i * 13 + j];
        vec2 a = from.xy;
        vec2 ab = uLanes[i * 13 + j + 1].xy - a;
        float h = clamp(dot(vPicture - a, ab) / dot(ab, ab), 0.0, 1.0);
        float d = distance(vPicture, a + ab * h);
        if (d < best) {
          best = d;
          along = from.z + h * length(ab);
        }
      }
      // the dashes have slid uShift along it; their ends are round
      float u = along - uShift[i];
      vec4 p = uDashes[i];
      float off = offDash(u, 0.0, p.x);
      if (uPairs[i] > 1.5) off = min(off, offDash(u, p.x + p.y, p.x + p.y + p.z));
      keep *= 1.0 - 0.38 * cover(length(vec2(off, best)), 0.06);
    }
    for (int k = 0; k < ${POND_RINGS.length}; k++) {
      // an ellipse 0.7 by 0.38 at its size now, its line growing with it
      float s = uRingNow[k].x;
      vec2 r = vec2(0.7, 0.38) * s;
      vec2 q = vPicture - uRings[k];
      float g = length(q / r);
      float d = abs((g - 1.0) * g / max(length(q / (r * r)), 1e-6));
      keep *= 1.0 - uRingNow[k].y * cover(d, 0.05 * s);
    }
    float alpha = 1.0 - keep;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** CSS's ease-out (cubic-bezier(0, 0, 0.58, 1)) at x, 0 to 1 */
function easeOut(x: number): number {
  const at = (t: number, p1: number, p2: number) =>
    3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid, 0, 0.58) < x) lo = mid;
    else hi = mid;
  }
  return at((lo + hi) / 2, 0, 1);
}

/** A ring's size and how strongly it shows, `phase` (0 to 1) of the way through its 6.8 s (the page's pd-ring keyframes) */
function ringAt(phase: number): [scale: number, opacity: number] {
  const scale = phase < 0.45 ? 0.2 + 1.4 * easeOut(phase / 0.45) : 1.6;
  const opacity =
    phase < 0.08
      ? 0.55 * easeOut(phase / 0.08)
      : phase < 0.45
        ? 0.55 * (1 - easeOut((phase - 0.08) / 0.37))
        : 0;
  return [scale, opacity];
}

/** The pond's streaks and rings, on its water */
export function Pond() {
  const still = useStill();
  const geometry = useMemo(() => {
    const outline = POND_WATER.map(([x, z]) => new Vector2(x, z));
    const triangles = ShapeUtils.triangulateShape(outline, []);
    const g = new BufferGeometry();
    g.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(POND_WATER.flatMap(([x, z]) => [x, LIFT, z])), 3),
    );
    g.setIndex(triangles.flat());
    g.computeBoundingSphere();
    return g;
  }, []);
  const material = useMemo(() => {
    // each point of each streak's line, with how far along the line it is
    const lanes = POND_LANES.flatMap((lane) => {
      let along = 0;
      return lane.map((p, j) => {
        if (j) along += Math.hypot(p[0] - lane[j - 1][0], p[1] - lane[j - 1][1]);
        return new Vector3(p[0], p[1], along);
      });
    });
    return new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: UniformsUtils.merge([
        UniformsLib.fog,
        {
          uLanes: { value: lanes },
          uDashes: { value: DASHES.map(([a, b, c = 0, d = 0]) => [a, b, c, d]).flat() },
          uPairs: { value: DASHES.map((d) => d.length / 2) },
          uShift: { value: DASHES.map(() => 0) },
          uRings: { value: POND_RINGS.map(([a, d]) => new Vector2(a, d)) },
          uRingNow: { value: POND_RINGS.map(() => new Vector2(0.2, 0)) },
        },
      ]),
      transparent: true,
      depthWrite: false,
      // (its triangles face whichever way the outline went round)
      side: DoubleSide,
      fog: true,
      // it lies just above the water, so it's drawn a little nearer than it is
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -4,
    });
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  const water = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const look = water.current?.material as ShaderMaterial | undefined;
    if (still || !look) return;
    const t = clock.elapsedTime;
    const shift = look.uniforms.uShift.value as number[];
    // each streak's own speed (7, 8.6 or 10.2 s for a whole pattern), each starting 1.3 s on from the last
    for (let i = 0; i < shift.length; i++) {
      const time = 7 + (i % 3) * 1.6;
      shift[i] = PATTERN * (((t + i * 1.3) / time) % 1);
    }
    // each ring 1.7 s on from the last
    const rings = look.uniforms.uRingNow.value as Vector2[];
    rings.forEach((ring, k) => ring.set(...ringAt(((t + k * 1.7) / RING_TIME) % 1)));
  });
  return <mesh ref={water} geometry={geometry} material={material} />;
}
