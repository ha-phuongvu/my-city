"use client";

import { CityId } from "../../constants/layout.constants";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  type Group,
  type Mesh,
  MeshStandardMaterial,
  type Object3D,
  SRGBColorSpace,
} from "three";
import { BED_FEET, BED_LINES, BED_PARTS } from "../../constants/cities/music/bedLayout.constants";
import { useCityHit, useInCity } from "../../utils/cityPointing";
import { through } from "../../utils/cycle";
import { usePlayWhilePointed, useStill } from "../../utils/pointing";
import { useParts } from "../../utils/useParts";
import { isWinter } from "../../utils/season";
import { Cover, Flakes } from "../../utils/snowCover";
import { setSnowCover } from "../../utils/wave";
import type { SceneryPlacement } from "../../constants/cities/sceneryLayout.constants";
import {
  AGAIN,
  BUD,
  CUT,
  GROW,
  HIT_HEIGHT,
  PAPER,
  STAGES,
} from "../../constants/cities/music/FlowerBeds.constants";

type Rgb = { r: number; g: number; b: number };

type Growing = {
  mesh: Mesh;
  positions: BufferAttribute;
  base: Float32Array;

  foot: Float32Array;

  middle?: Float32Array;
};

type Paint = { material: MeshStandardMaterial; own: Rgb; blossom: boolean };

function plantsOf(model: Object3D) {
  const growing: Growing[] = [];
  const paints: Paint[] = [];
  model.children.forEach((bed, b) => {
    bed.children.forEach((object, p) => {
      const mesh = object as Mesh;
      const part = BED_PARTS[b]?.[p];
      if (!mesh.isMesh || !(mesh.material instanceof MeshStandardMaterial)) return;
      paints.push({
        material: mesh.material,
        own: mesh.material.color.getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace),
        blossom: !!part?.blossom,
      });
      if (!part || mesh.material.name !== part.material) return;

      mesh.geometry = mesh.geometry.clone();
      const positions = mesh.geometry.getAttribute("position") as BufferAttribute;
      const count = part.runs.reduce((sum, n, i) => (i % 2 ? sum : sum + n), 0);
      if (count !== positions.count) return;
      const base = Float32Array.from(positions.array);
      const foot = new Float32Array(positions.count * 3);
      const middle = part.blossom ? new Float32Array(positions.count * 3) : undefined;
      let v = 0;
      for (let r = 0; r < part.runs.length; r += 2) {
        const n = part.runs[r];
        const plant = part.runs[r + 1];

        let mx = 0;
        let my = 0;
        let mz = 0;
        for (let i = v; i < v + n; i++) {
          mx += base[3 * i];
          my += base[3 * i + 1];
          mz += base[3 * i + 2];
        }
        for (let i = v; i < v + n; i++) {
          foot.set([BED_FEET[3 * plant], BED_FEET[3 * plant + 1], BED_FEET[3 * plant + 2]], 3 * i);
          middle?.set([mx / n, my / n, mz / n], 3 * i);
        }
        v += n;
      }
      growing.push({ mesh, positions, base, foot, middle });
    });
  });
  return { growing, paints };
}

function hitBand({ line, foot, width }: (typeof BED_LINES)[number]): BufferGeometry {
  const n = line.length / 2;
  const position: number[] = [];
  const index: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    const dx = line[2 * b] - line[2 * a];
    const dz = line[2 * b + 1] - line[2 * a + 1];
    const l = Math.hypot(dx, dz) || 1;
    const sx = (-dz / l) * (width + 0.3) * 0.5;
    const sz = (dx / l) * (width + 0.3) * 0.5;
    const [x, z] = [line[2 * i], line[2 * i + 1]];

    position.push(
      x + sx,
      foot,
      z + sz,
      x - sx,
      foot,
      z - sz,
      x + sx,
      foot + HIT_HEIGHT,
      z + sz,
      x - sx,
      foot + HIT_HEIGHT,
      z - sz,
    );
    if (i < n - 1) {
      const q = 4 * i;
      for (const [c, d] of [
        [2, 3],
        [0, 2],
        [3, 1],
        [1, 0],
      ])
        index.push(q + c, q + d, q + 4 + c, q + d, q + 4 + d, q + 4 + c);
    }
  }

  const last = 4 * (n - 1);
  index.push(0, 1, 2, 2, 1, 3, last, last + 2, last + 1, last + 1, last + 2, last + 3);
  const band = new BufferGeometry();
  band.setAttribute("position", new BufferAttribute(new Float32Array(position), 3));
  band.setIndex(index);
  return band;
}

function drawBeds(
  { growing, paints }: ReturnType<typeof plantsOf>,
  k: number,
  fade: number,
  paper: Rgb,
) {
  const grow = 0.2 + 0.8 * Math.min(1, k / 0.6) ** 0.7;
  const open = Math.min(1, Math.max(0, (k - 0.45) / 0.45));
  const opens = 0.3 + 0.7 * open;
  for (const { mesh, positions, base, foot, middle } of growing) {
    const out = positions.array as Float32Array;
    mesh.visible = !middle || open > 0;
    if (k >= 1) out.set(base);
    else
      for (let i = 0; i < out.length; i++) {
        const p = middle ? middle[i] + opens * (base[i] - middle[i]) : base[i];
        out[i] = foot[i] + grow * (p - foot[i]);
      }
    positions.needsUpdate = true;
  }

  for (const { material, own, blossom } of paints) {
    const bud = blossom ? 0.75 * (1 - open) : 0;
    const c = {
      r: own.r + (BUD.r - own.r) * bud,
      g: own.g + (BUD.g - own.g) * bud,
      b: own.b + (BUD.b - own.b) * bud,
    };
    material.color.setRGB(
      c.r + (paper.r - c.r) * fade,
      c.g + (paper.g - c.g) * fade,
      c.b + (paper.b - c.b) * fade,
      SRGBColorSpace,
    );
  }
}

function alongBed({ line, width }: (typeof BED_LINES)[number]): () => [number, number] {
  const n = line.length / 2;
  return () => {
    const i = Math.min(n - 2, Math.floor(Math.random() * (n - 1)));
    const u = Math.random();
    const x = line[2 * i] + (line[2 * i + 2] - line[2 * i]) * u;
    const z = line[2 * i + 1] + (line[2 * i + 3] - line[2 * i + 1]) * u;
    const dx = line[2 * i + 2] - line[2 * i];
    const dz = line[2 * i + 3] - line[2 * i + 1];
    const l = Math.hypot(dx, dz) || 1;
    const off = (Math.random() - 0.5) * width;
    return [x - (dz / l) * off, z + (dx / l) * off];
  };
}

export function FlowerBeds(placement: SceneryPlacement) {
  return isWinter() ? <SnowyBeds {...placement} /> : <GrowingBeds {...placement} />;
}

function SnowyBeds({ model: name, position, yaw, scale, fade }: SceneryPlacement) {
  const { model } = useParts(`/models/${name}.glb`);
  const still = useStill();
  const pointing = useInCity(CityId.Music);
  const hit = useCityHit(CityId.Music);
  const bands = useMemo(() => BED_LINES.map(hitBand), []);
  const cover = useRef(new Cover());
  const falling = useRef<Group>(null);
  const flakes = useMemo(() => BED_LINES.map((bed) => new Flakes(alongBed(bed), bed.foot)), []);
  const snowy = useRef<MeshStandardMaterial[]>([]);
  const wasIn = useRef(false);
  useLayoutEffect(() => {
    const plants = plantsOf(model);
    drawBeds(plants, 1, fade, PAPER);
    snowy.current = plants.paints.map(({ material }) => material);
  }, [model, fade]);
  useLayoutEffect(() => {
    const group = falling.current;
    if (!group) return;
    for (const f of flakes) group.add(f.points);
    return () => {
      for (const f of flakes) {
        group.remove(f.points);
        f.dispose();
      }
    };
  }, [flakes]);
  useEffect(() => () => bands.forEach((band) => band.dispose()), [bands]);

  useFrame(({ clock }, delta) => {
    if (pointing && !wasIn.current && !still) cover.current.start();
    wasIn.current = pointing;
    const c = cover.current;
    if (c.step(delta)) for (const m of snowy.current) setSnowCover(m, c.white);
    for (const f of flakes) f.fall(clock.elapsedTime, c.running);
  });

  return (
    <group position={position} rotation-y={yaw} scale={scale}>
      <primitive object={model} />
      <group {...hit}>
        {bands.map((band, i) => (
          <mesh key={i} geometry={band}>
            <meshBasicMaterial colorWrite={false} depthWrite={false} side={DoubleSide} />
          </mesh>
        ))}
      </group>
      <group ref={falling} />
    </group>
  );
}

function GrowingBeds({ model: name, position, yaw, scale, fade }: SceneryPlacement) {
  const { model } = useParts(`/models/${name}.glb`);
  const still = useStill();
  const pointing = useInCity(CityId.Music);
  const hit = useCityHit(CityId.Music);
  const play = usePlayWhilePointed(GROW, { pointing }, AGAIN);
  const bands = useMemo(() => BED_LINES.map(hitBand), []);
  const plants = useRef<ReturnType<typeof plantsOf>>(null);
  const shown = useRef<number | null>(null);
  useLayoutEffect(() => {
    plants.current = plantsOf(model);
    shown.current = null;
  }, [model]);
  useEffect(() => () => bands.forEach((band) => band.dispose()), [bands]);

  useFrame(() => {
    const t = still ? undefined : play();
    const k = t === undefined ? 1 : t < CUT ? 0 : through(STAGES, (t - CUT) / (GROW - CUT));
    if (!plants.current || k === shown.current) return;
    shown.current = k;
    drawBeds(plants.current, k, fade, PAPER);
  });

  return (
    <group position={position} rotation-y={yaw} scale={scale}>
      <primitive object={model} />
      <group {...hit}>
        {bands.map((band, i) => (
          <mesh key={i} geometry={band}>
            <meshBasicMaterial colorWrite={false} depthWrite={false} side={DoubleSide} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
