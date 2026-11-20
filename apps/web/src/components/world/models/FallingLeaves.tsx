"use client";

import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  DoubleSide,
  type Mesh,
  MeshBasicMaterial,
  Quaternion,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector3,
} from "three";
import { rng } from "../utils/foliageMesh";
import { ease } from "../utils/cycle";
import {
  FACING,
  FALL_AT,
  GONE,
  GROUND,
  LEAVES,
  PICTURE,
  RIGHT,
  SHAKE_EVERY,
  SPOTS,
  TOWARD_LEAF,
  VIEW,
} from "../constants/FallingLeaves.constants";

// Pointing at a round tree shakes its leaves loose, as on the prototype's map (shedLeaves): three at
// first, then one or two every half second for as long as the pointer stays. Each leaf comes loose
// from a spot on the side of the crown we see, flutters down to the grass swinging from side to side
// and spinning as it goes, lands and fades. The prototype moves its leaves over its picture: a unit
// across the picture is √(2/3) of a three.js unit along the screen's right, and a unit down it is a
// unit of height.

/** A round tree's crown, in three.js units */
export type Crown = {
  /** the middle of the crown */
  center: [number, number, number];
  /** its half size across and its half height */
  across: number;
  up: number;
  /** the tree's size (the prototype's s), which sets how long its leaves are */
  size: number;
  /** the colours its leaves come down in */
  tones: string[];
};

const SPIN = new Quaternion();

// a leaf's fall (leaf-fall): where it is across and down at each share of its time, from its sway
// (sw), its drift (dx) and its drop (dy), easing in and out between them
const fallAt = (sw: number, dx: number, dy: number): [number, number][] => [
  [0, 0],
  [sw, dy * 0.2],
  [dx * 0.4 - sw, dy * 0.44],
  [dx * 0.7 + sw * 0.7, dy * 0.7],
  [dx, dy],
  [dx, dy],
];

type Leaf = {
  start: number;
  length: number;
  from: Vector3;
  path: [number, number][];
  size: number;
  spin: number;
  turns: number;
  /** how far into its spin it already is when it comes loose */
  lead: number;
};

/** Spots on the side of the crown we see where a leaf can come loose (three.js), seeded as on the map */
function spotsOn(crown: Crown): Vector3[] {
  const [x, y, z] = crown.center;
  const c = [x, z, y + GROUND];
  const ax = [crown.across, crown.across, crown.up];
  const r = rng((Math.round(c[0] * 97 + c[1] * 13) * 2654435761) >>> 0);
  const spots: Vector3[] = [];
  for (let k = 0; spots.length < SPOTS && k < 400; k++) {
    const u = r() * Math.PI * 2;
    const v = Math.asin(2 * r() - 1);
    const n = [Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)];
    if (n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2] < 0.2 || n[2] > 0.5 || n[2] < -0.6)
      continue;
    spots.push(new Vector3(c[0] + n[0] * ax[0], c[2] + n[2] * ax[2] - GROUND, c[1] + n[1] * ax[1]));
  }
  return spots;
}

/** A leaf's outline: two curves meeting at its tip and stalk, a unit long */
function leafShape(): ShapeGeometry {
  const shape = new Shape();
  shape.moveTo(0, -0.5);
  shape.quadraticCurveTo(0.42, 0, 0, 0.5);
  shape.quadraticCurveTo(-0.42, 0, 0, -0.5);
  return new ShapeGeometry(shape, 6);
}

/** The round trees' crowns, which shed leaves while the pointer is on them */
export function FallingLeaves({ crowns }: { crowns: Crown[] }) {
  const meshes = useRef<(Mesh | null)[]>([]);
  const leaves = useRef<(Leaf | null)[]>(Array.from({ length: LEAVES }, () => null));
  const shaking = useRef<{ crown: number; next: number } | null>(null);
  const now = useRef(0);
  const spots = useMemo(() => crowns.map(spotsOn), [crowns]);
  const outline = useMemo(() => leafShape(), []);
  const ball = useMemo(() => new SphereGeometry(1, 12, 8), []);
  const looks = useMemo(
    () =>
      Array.from(
        { length: LEAVES },
        () => new MeshBasicMaterial({ side: DoubleSide, transparent: true, depthWrite: false }),
      ),
    [],
  );
  useEffect(
    () => () => {
      outline.dispose();
      ball.dispose();
      for (const look of looks) look.dispose();
    },
    [outline, ball, looks],
  );

  /** Shakes n leaves loose from crown i */
  const shed = (i: number, n: number) => {
    const crown = crowns[i];
    const length = Math.max(0.2, 0.2 * crown.size);
    for (let k = 0; k < n; k++) {
      const slot = leaves.current.findIndex((leaf) => leaf === null);
      if (slot < 0) return;
      const from = spots[i][Math.floor(Math.random() * spots[i].length)];
      const time = 2.6 + Math.random() * 1.4;
      const sway = length * (0.6 + Math.random() * 0.6) * (Math.random() < 0.5 ? -1 : 1);
      const spin = 0.35 + Math.random() * 0.25;
      leaves.current[slot] = {
        start: now.current,
        length: time,
        from,
        path: fallAt(sway, (Math.random() - 0.5) * length * 2, from.y),
        size: length,
        spin,
        turns: Math.max(1, Math.round((time * 0.78) / spin)),
        lead: Math.random() * spin,
      };
      looks[slot].color.set(crown.tones[Math.floor(Math.random() * crown.tones.length)]);
    }
  };

  useFrame((_, delta) => {
    now.current += delta;
    const shake = shaking.current;
    if (shake && now.current >= shake.next) {
      shed(shake.crown, 1 + Math.floor(Math.random() * 2));
      shake.next += SHAKE_EVERY;
    }
    leaves.current.forEach((leaf, slot) => {
      const mesh = meshes.current[slot];
      if (!mesh) return;
      const age = leaf ? now.current - leaf.start : Infinity;
      if (!leaf || age > GONE) {
        leaves.current[slot] = null;
        mesh.visible = false;
        return;
      }
      // where it has got to on its way down, easing in and out from each point of its path to the next
      const k = Math.min(1, age / leaf.length);
      let i = 0;
      while (i < FALL_AT.length - 2 && k > FALL_AT[i + 1]) i++;
      const f = ease((k - FALL_AT[i]) / (FALL_AT[i + 1] - FALL_AT[i]));
      const [x0, y0] = leaf.path[i];
      const [x1, y1] = leaf.path[i + 1];
      const across = (x0 + (x1 - x0) * f) * PICTURE;
      mesh.position.copy(leaf.from).addScaledVector(RIGHT, across);
      mesh.position.y -= y0 + (y1 - y0) * f;
      looks[slot].opacity = k < 0.06 ? k / 0.06 : k > 0.8 ? (1 - k) / 0.2 : 1;
      // its spin: tipped from -55 to 45 degrees and turned edge-on to 0.55 of its width, back and forth
      const spun = (age + leaf.lead) / leaf.spin;
      const round = Math.floor(spun);
      const swing =
        round >= leaf.turns
          ? leaf.turns % 2
          : round % 2
            ? 1 - ease(spun - round)
            : ease(spun - round);
      mesh.quaternion
        .copy(FACING)
        .multiply(SPIN.setFromAxisAngle(TOWARD_LEAF, ((55 - 100 * swing) * Math.PI) / 180));
      mesh.scale.set(leaf.size * PICTURE * (1 - 0.45 * swing), leaf.size * PICTURE, 1);
      mesh.visible = true;
    });
  });

  const enter = (i: number) => (event: ThreeEvent<PointerEvent>) => {
    // not while the map is being dragged
    if (event.buttons || shaking.current?.crown === i) return;
    shed(i, 3);
    shaking.current = { crown: i, next: now.current + SHAKE_EVERY };
  };
  const leave = (i: number) => () => {
    if (shaking.current?.crown === i) shaking.current = null;
  };

  return (
    <group>
      {/* where pointing starts it: a ball round each crown, as the prototype's ring round it */}
      {crowns.map((crown, i) => (
        <mesh
          key={i}
          geometry={ball}
          position={crown.center}
          scale={1.15 * crown.across * PICTURE}
          visible={false}
          onPointerOver={enter(i)}
          onPointerOut={leave(i)}
        />
      ))}
      {looks.map((look, slot) => (
        <mesh
          key={slot}
          ref={(mesh) => {
            meshes.current[slot] = mesh;
          }}
          geometry={outline}
          material={look}
          visible={false}
        />
      ))}
    </group>
  );
}
