"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, DoubleSide, MeshBasicMaterial, Vector3 } from "three";
import { useStill } from "./motion/pointing";
import { ALONG, DRIFT, LIFE, MOST, POINTS, THICK, UP, WIND } from "./WindLines.constants";

// The wind lines in the air, as on the prototype's map (its windLines, after bruno-simon.com): every
// 0.3 to 2 seconds a thin white line, a gentle wave about 8 long, appears somewhere in view lying along
// the wind (at most four at once). Over its 3.6 seconds a thick part runs along it from the upwind end
// to the other, so it draws itself in and fades out behind, tapering at both ends, as it drifts a little
// downwind. Nobody who has asked for less motion sees them.
//
// The prototype draws them on its picture; here they float over the ground, sized so that seen from
// the opening view they match its picture: the wind's way on the picture is (0.97, 0.24), which on the
// ground is WIND below, and a map unit along it is ALONG picture units; the wave rises and falls (a
// picture unit up is a map unit up), and the line always faces the camera, 0.22 picture units
// (0.22 × √(2/3) of a map unit) thick at its thickest.

type Line = { center: Vector3; born: number; length: number; wave: number };

const smooth = (q: number) => {
  const k = Math.max(0, Math.min(1, q));
  return k * k * (3 - 2 * k);
};

/** Wind lines drifting over the land, in white, drawn in front of nothing they're behind */
export function WindLines() {
  const still = useStill();
  const lines = useRef<Line[]>([]);
  const next = useRef(0);
  const [geometry, material] = useMemo(() => {
    const shape = new BufferGeometry();
    shape.setAttribute("position", new BufferAttribute(new Float32Array(MOST * POINTS * 2 * 3), 3));
    const index: number[] = [];
    for (let l = 0; l < MOST; l++) {
      const o = l * POINTS * 2;
      for (let q = 0; q < POINTS - 1; q++) {
        const a = o + q * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    shape.setIndex(index);
    const look = new MeshBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      side: DoubleSide,
    });
    return [shape, look];
  }, []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const at = useMemo(() => new Vector3(), []);
  const run = useMemo(() => new Vector3(), []);
  const side = useMemo(() => new Vector3(), []);
  const toCamera = useMemo(() => new Vector3(), []);
  const near = useMemo(() => new Vector3(), []);
  const far = useMemo(() => new Vector3(), []);

  useFrame(({ clock, camera }) => {
    if (still) return;
    const now = clock.elapsedTime;
    // a new line every so often, somewhere in view: under a random spot on the screen, at a height in
    // the air, where that's not off past the haze
    if (now >= next.current) {
      next.current = now + 0.3 + Math.random() * 1.7;
      if (lines.current.length < MOST) {
        for (let tries = 0; tries < 6; tries++) {
          const height = 1.2 + Math.random() * 1.6;
          const x = Math.random() * 2 - 1;
          const y = Math.random() * 2 - 1;
          near.set(x, y, -1).unproject(camera);
          far.set(x, y, 1).unproject(camera).sub(near);
          if (far.y > -1e-6) continue;
          const reach = (height - near.y) / far.y;
          if (reach < 0) continue;
          const center = near.clone().addScaledVector(far, reach);
          if (center.distanceTo(camera.position) > 120) continue;
          lines.current.push({
            center,
            born: now,
            length: (7 + Math.random() * 3) / ALONG,
            wave: 0.45 + Math.random() * 0.2,
          });
          break;
        }
      }
    }
    lines.current = lines.current.filter((line) => now - line.born < LIFE);

    const position = geometry.getAttribute("position") as BufferAttribute;
    const points = position.array as Float32Array;
    points.fill(0);
    lines.current.forEach((line, l) => {
      const p = (now - line.born) / LIFE;
      const head = p * 3 - 1;
      for (let q = 0; q < POINTS; q++) {
        const r = q / (POINTS - 1);
        const along = (r - 0.5) * line.length;
        // the wave, and how steeply it rises or falls there
        const off = -0.5 * line.wave * Math.cos(3 * Math.PI * r);
        const slope = (0.5 * line.wave * 3 * Math.PI * Math.sin(3 * Math.PI * r)) / line.length;
        const thick = THICK * smooth(1 - Math.abs(r * 2 - 1)) * smooth(1 - Math.abs(r - head));
        at.copy(line.center)
          .addScaledVector(WIND, along + DRIFT * p)
          .addScaledVector(UP, off);
        // its thickness lies square to the line and to the way to the camera, so it always faces it
        run.copy(WIND).addScaledVector(UP, slope);
        toCamera.subVectors(camera.position, at);
        side
          .crossVectors(run, toCamera)
          .normalize()
          .multiplyScalar(thick / 2);
        const o = (l * POINTS + q) * 6;
        points[o] = at.x + side.x;
        points[o + 1] = at.y + side.y;
        points[o + 2] = at.z + side.z;
        points[o + 3] = at.x - side.x;
        points[o + 4] = at.y - side.y;
        points[o + 5] = at.z - side.z;
      }
    });
    position.needsUpdate = true;
  });

  if (still) return null;
  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
}
