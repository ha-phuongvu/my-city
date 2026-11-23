"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  type Group,
  type Mesh,
  MeshStandardMaterial,
} from "three";
import {
  DRIFT_LIFT,
  HIT,
  PILE,
  PILE_UP,
  PILES,
  SHAPE_SEED,
} from "../constants/environment/SnowPiles.constants";
import { rng } from "../utils/foliageMesh";
import { outskirtsPiles, type Pile } from "../utils/outskirts";
import { useStill } from "../utils/pointing";
import { useRoomLight, withRoomLight } from "../utils/roomLight";
import { Cover, Flakes, inOval } from "../utils/snowCover";

const own: Pile[] = PILES.map(([x, z, rx, rz, seed]) => ({ x, z, rx, rz, seed }));
const spaces = [...new Set(PILES.map((p) => p[5]))].map((space) =>
  own.filter((_, i) => PILES[i][5] === space),
);
const ALL: Pile[] = [...own, ...outskirtsPiles(spaces)];

function pileShape({ x: cx, z: cz, rx, rz, seed }: Pile) {
  const S = PILE;
  const r = rng(SHAPE_SEED.base + seed * SHAPE_SEED.step);
  const ph = [r() * 6.28, r() * 6.28];
  const H = (S.high + S.tall * Math.min(rx, rz)) * (0.7 + r() * 0.6);
  const wob = [0.05 + r() * 0.12, 0.03 + r() * 0.07];
  const edge = (a: number) =>
    1 + wob[0] * Math.sin(3 * a + ph[0]) + wob[1] * Math.sin(5 * a + ph[1]);
  const humps = Array.from({ length: 1 + Math.floor(r() * S.humps) }, () => {
    const a = r() * 6.28;
    const d = 0.25 + r() * 0.4;
    return [d * Math.cos(a), d * Math.sin(a), 0.22 + r() * 0.18, 0.12 + r() * 0.12];
  });

  const position: number[] = [];
  const color: number[] = [];
  const index: number[] = [];
  const snow = new Color(S.color);
  const drift = new Color(S.drift);

  const middle = position.length / 3;
  position.push(cx, DRIFT_LIFT, cz);
  color.push(drift.r, drift.g, drift.b);
  for (let j = 0; j < S.segs; j++) {
    const a = (j / S.segs) * Math.PI * 2;
    const e = edge(a) * S.spread;
    position.push(cx + rx * e * Math.cos(a), DRIFT_LIFT, cz + rz * e * Math.sin(a));
    color.push(drift.r, drift.g, drift.b);
  }
  for (let j = 0; j < S.segs; j++)
    index.push(middle, middle + 1 + ((j + 1) % S.segs), middle + 1 + j);

  const dome = position.length / 3;
  for (let i = 0; i <= S.rings; i++)
    for (let j = 0; j < S.segs; j++) {
      const p = i / S.rings;
      const a = (j / S.segs) * Math.PI * 2;
      const [u, v] = [p * Math.cos(a), p * Math.sin(a)];
      let h = Math.max(0, 1 - p * p) ** 0.7;
      for (const [hu, hv, hr, hh] of humps)
        h += hh * Math.exp(-((u - hu) ** 2 + (v - hv) ** 2) / (hr * hr)) * (1 - p);
      const e = edge(a);
      position.push(cx + rx * p * e * Math.cos(a), H * h, cz + rz * p * e * Math.sin(a));
      color.push(snow.r, snow.g, snow.b);
    }
  const at = (i: number, j: number) => dome + i * S.segs + (j % S.segs);
  for (let i = 0; i < S.rings; i++)
    for (let j = 0; j < S.segs; j++)
      index.push(
        at(i, j),
        at(i + 1, j + 1),
        at(i + 1, j),
        at(i, j),
        at(i, j + 1),
        at(i + 1, j + 1),
      );

  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(position, 3));
  g.setAttribute("color", new Float32BufferAttribute(color, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

const unitDisc = new CylinderGeometry(1, 1, 1, 24);

export function SnowPiles() {
  const still = useStill();
  const light = useRoomLight();
  const shapes = useMemo(() => ALL.map(pileShape), []);
  const material = useMemo(
    () =>
      withRoomLight(
        new MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }),
        light,
      ),
    [light],
  );
  const covers = useMemo(() => ALL.map(() => new Cover(PILE_UP.grow, PILE_UP.wait)), []);
  const meshes = useRef<(Mesh | null)[]>([]);
  const falling = useRef<Group>(null);
  const flakes = useRef(new Map<number, Flakes>());

  useEffect(
    () => () => {
      shapes.forEach((shape) => shape.dispose());
      material.dispose();
    },
    [shapes, material],
  );
  useEffect(() => {
    const made = flakes.current;
    return () => {
      made.forEach((f) => f.dispose());
      made.clear();
    };
  }, []);

  const flakesOf = (i: number) => {
    let made = flakes.current.get(i);
    if (!made) {
      const { x, z, rx, rz } = ALL[i];
      made = new Flakes(inOval(x, z, rx * HIT.wide, rz * HIT.wide), 0);
      flakes.current.set(i, made);
      falling.current?.add(made.points);
    }
    return made;
  };

  useFrame(({ clock }, delta) => {
    covers.forEach((cover, i) => {
      if (cover.step(delta)) {
        const mesh = meshes.current[i];
        if (mesh) {
          const { x, z } = ALL[i];
          const k = cover.white;
          const s = PILE.least + (1 - PILE.least) * k;
          const h = Math.max(0.001, k);
          mesh.scale.set(s, h, s);
          mesh.position.set(x * (1 - s), 0, z * (1 - s));
        }
      }
      if (cover.running || flakes.current.has(i))
        flakesOf(i).fall(clock.elapsedTime, cover.running);
    });
  });

  const start = (i: number) => () => {
    if (!still) covers[i].start();
  };

  return (
    <group userData={{ noSnow: true }}>
      {shapes.map((shape, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            meshes.current[i] = mesh;
          }}
          geometry={shape}
          material={material}
          castShadow
          receiveShadow
        />
      ))}
      {!still &&
        ALL.map(({ x, z, rx, rz }, i) => (
          <mesh
            key={i}
            position={[x, HIT.high / 2, z]}
            scale={[rx * HIT.wide, HIT.high, rz * HIT.wide]}
            geometry={unitDisc}
            onPointerOver={start(i)}
            onPointerDown={start(i)}
          >
            <meshBasicMaterial colorWrite={false} depthWrite={false} />
          </mesh>
        ))}
      <group ref={falling} />
    </group>
  );
}
