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
import { rng } from "../utils/random";
import { ease } from "../utils/curves";
import {
  CLUMPS,
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
} from "../constants/environment/FallingLeaves.constants";

export type Crown = {
  center: [number, number, number];

  across: number;
  up: number;

  size: number;

  tones: string[];
};

const SPIN = new Quaternion();

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

  lead: number;
};

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

function leafShape(): ShapeGeometry {
  const shape = new Shape();
  if (CLUMPS.on) {
    for (let k = 0; k <= 40; k++) {
      const a = (k / 40) * Math.PI * 2;
      const r = 0.5 * (1 + 0.16 * Math.sin(a * 5) + 0.07 * Math.sin(a * 9 + 1));
      if (k) shape.lineTo(r * Math.cos(a), r * Math.sin(a));
      else shape.moveTo(r, 0);
    }
    return new ShapeGeometry(shape, 6);
  }
  shape.moveTo(0, -0.5);
  shape.quadraticCurveTo(0.42, 0, 0, 0.5);
  shape.quadraticCurveTo(-0.42, 0, 0, -0.5);
  return new ShapeGeometry(shape, 6);
}

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

  const shed = (i: number, n: number) => {
    const crown = crowns[i];
    const length = Math.max(0.2, 0.2 * crown.size);
    for (let k = 0; k < n; k++) {
      const slot = leaves.current.findIndex((leaf) => leaf === null);
      if (slot < 0) return;
      const from = spots[i][Math.floor(Math.random() * spots[i].length)];
      const time = 2.6 + Math.random() * 1.4;
      const sway =
        length * CLUMPS.sway * (0.6 + Math.random() * 0.6) * (Math.random() < 0.5 ? -1 : 1);
      const spin = 0.35 + Math.random() * 0.25;
      leaves.current[slot] = {
        start: now.current,
        length: time,
        from,
        path: fallAt(sway, (Math.random() - 0.5) * length * 2 * CLUMPS.sway, from.y),
        size: length,
        spin,
        turns: Math.max(1, Math.round((time * 0.78) / spin)),
        lead: Math.random() * spin,
      };
      const tones = CLUMPS.on ? CLUMPS.colors : crown.tones;
      looks[slot].color.set(tones[Math.floor(Math.random() * tones.length)]);
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

      if (CLUMPS.on)
        mesh.scale.set(
          leaf.size * PICTURE * CLUMPS.size,
          leaf.size * PICTURE * CLUMPS.size * (1 - 0.1 * swing),
          1,
        );
      else mesh.scale.set(leaf.size * PICTURE * (1 - 0.45 * swing), leaf.size * PICTURE, 1);
      mesh.visible = true;
    });
  });

  const enter = (i: number) => (event: ThreeEvent<PointerEvent>) => {
    if (event.buttons || shaking.current?.crown === i) return;
    shed(i, 3);
    shaking.current = { crown: i, next: now.current + SHAKE_EVERY };
  };
  const leave = (i: number) => () => {
    if (shaking.current?.crown === i) shaking.current = null;
  };

  return (
    <group>
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
