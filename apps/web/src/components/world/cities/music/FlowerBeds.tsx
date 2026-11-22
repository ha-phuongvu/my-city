"use client";

import { CityId } from "../../constants/layout.constants";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
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

// Music City's five flower beds round the piano. Pointing anywhere in Music City grows them all, as
// the prototype's curvedBed draws them growing (its CROP_STAGES.bloom, a stage every 125 ms over
// 1.5 s): cut back to little stubs, the plants come up from their feet to full size by 0.6, buds show
// from 0.45, green and small, then swell and colour until every blossom is open at 0.9. They stand in
// flower a moment, then grow again, for as long as the pointer stays in the city; once it leaves they
// finish growing and stay in flower.

type Rgb = { r: number; g: number; b: number };

/** One primitive of the plants: where its vertices start, and what each grows from */
type Growing = {
  mesh: Mesh;
  positions: BufferAttribute;
  base: Float32Array;
  /** each vertex's plant's foot (x, y, z) */
  foot: Float32Array;
  /** for blossoms, each vertex's solid's middle, which it opens about */
  middle?: Float32Array;
};

/** Its colours: each material's own (in sRGB), to fade toward the paper and, for blossoms, to bud from */
type Paint = { material: MeshStandardMaterial; own: Rgb; blossom: boolean };

/** The beds' plants and colours, matched to the model's primitives by bedLayout.ts */
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
      // (its own copy of the shape, as it is reshaped while it grows)
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
        // a blossom's middle: the average of its corners, as the prototype's centroid
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

/** Where pointing at the beds counts as pointing at Music City: a band 0.3 wider than each bed, as tall as its plants */
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
    // its left and right edges, at its foot and up over its plants
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
  // and its ends
  const last = 4 * (n - 1);
  index.push(0, 1, 2, 2, 1, 3, last, last + 2, last + 1, last + 1, last + 2, last + 3);
  const band = new BufferGeometry();
  band.setAttribute("position", new BufferAttribute(new Float32Array(position), 3));
  band.setIndex(index);
  return band;
}

/** The beds at stage k of their growth (1 in full flower), faded `fade` of the way toward the paper */
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
        // a blossom opens about its own middle, then the whole plant grows from its foot
        const p = middle ? middle[i] + opens * (base[i] - middle[i]) : base[i];
        out[i] = foot[i] + grow * (p - foot[i]);
      }
    positions.needsUpdate = true;
  }
  // the buds green at first, taking their colour as they open; everything faded toward the paper
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

/** Music City's flower beds, growing while the city is pointed at */
export function FlowerBeds({ model: name, position, yaw, scale, fade }: SceneryPlacement) {
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
