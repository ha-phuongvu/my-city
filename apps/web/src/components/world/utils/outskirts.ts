import type { FlowerPatch } from "../constants/fieldLayout.constants";
import { CELLS, GRASS_CELLS, TREE_CELLS } from "../constants/outskirtsMask.constants";
import {
  APPLES,
  BUSH_COLORS,
  BUSHES,
  FLOWER_SHARE,
  GRASS,
  MEADOW_PATCHES,
  PATCHES,
  PINE_SIZE,
  ROUND_COLORS,
  ROUND_SIZE,
  SEED,
  WOODS,
} from "../constants/outskirts.constants";
import {
  type AppleTreePlacement,
  TREES,
  type TreePlacement,
} from "../constants/treeLayout.constants";
import { isWinter } from "./season";

function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bits(packed: string) {
  const bytes = Uint8Array.from(atob(packed), (c) => c.charCodeAt(0));
  return (x: number, z: number) => {
    const i = Math.floor(x - CELLS.from);
    const j = Math.floor(z - CELLS.from);
    if (i < 0 || j < 0 || i >= CELLS.count || j >= CELLS.count) return false;
    const k = j * CELLS.count + i;
    return (bytes[k >> 3] & (1 << (k & 7))) !== 0;
  };
}

const grassAt = bits(GRASS_CELLS);
const treeAt = bits(TREE_CELLS);

function noise(seed: number, size: number) {
  const corner = (i: number, j: number) => {
    let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(seed, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const octave = (x: number, z: number) => {
    const i = Math.floor(x);
    const j = Math.floor(z);
    const u = smooth(x - i);
    const v = smooth(z - j);
    const a = corner(i, j) + (corner(i + 1, j) - corner(i, j)) * u;
    const b = corner(i, j + 1) + (corner(i + 1, j + 1) - corner(i, j + 1)) * u;
    return a + (b - a) * v;
  };
  return (x: number, z: number) =>
    0.65 * octave(x / size, z / size) + 0.35 * octave((2 * x) / size + 17, (2 * z) / size + 31);
}

const between = (r: () => number, [a, b]: readonly [number, number]) => a + (b - a) * r();
const pick = <T>(r: () => number, list: readonly T[]) => list[Math.floor(r() * list.length)];

export function outskirtsGrass(blades: Int16Array, flowers: Int16Array) {
  const r = random(SEED);
  const B: number[] = [];
  const F: number[] = [];
  const nB = blades.length / 6;
  const nF = flowers.length / 9;
  for (let z = CELLS.from; z < CELLS.from + CELLS.count; z++) {
    for (let x = CELLS.from; x < CELLS.from + CELLS.count; x++) {
      const far = Math.hypot(x + 0.5, z + 0.5);
      if (far > GRASS.edge || !grassAt(x, z)) continue;
      const k = Math.min(1, Math.max(0, (far - GRASS.full) / (GRASS.edge - GRASS.full)));
      const many = GRASS.near + (GRASS.far - GRASS.near) * k;
      const count = Math.floor(many + r());
      for (let n = 0; n < count; n++) {
        const b = Math.floor(r() * nB) * 6;
        B.push(
          Math.round((x + r()) * 100),
          Math.round((z + r()) * 100),
          blades[b + 2],
          blades[b + 3],
          blades[b + 4],
          blades[b + 5],
        );
        if (r() < FLOWER_SHARE) {
          const f = Math.floor(r() * nF) * 9;
          F.push(
            Math.round((x + r()) * 100),
            Math.round((z + r()) * 100),
            ...flowers.subarray(f + 2, f + 9),
          );
        }
      }
    }
  }
  return { blades: Int16Array.from(B), flowers: Int16Array.from(F) };
}

function appleTreeAt(template: AppleTreePlacement, x: number, z: number): AppleTreePlacement {
  const dx = x - template.x;
  const dz = z - template.z;
  const move = ([ax, ay, az, color]: [number, number, number, string]) =>
    [+(ax + dx).toFixed(3), ay, +(az + dz).toFixed(3), color] as [number, number, number, string];
  return {
    ...template,
    x,
    z,
    hanging: template.hanging.map(move),
    fallen: template.fallen.map(move),
  };
}

function growWoods() {
  const r = random(SEED + 1);
  const grove = noise(SEED + 2, WOODS.grove);
  const pines = noise(SEED + 3, WOODS.grove * 1.3);
  const round: TreePlacement[] = [];
  const pine: TreePlacement[] = [];
  const bush: TreePlacement[] = [];
  const apple: AppleTreePlacement[] = [];
  const { spacing, jitter, edge } = WOODS;
  for (let gz = -edge; gz <= edge; gz += spacing) {
    for (let gx = -edge; gx <= edge; gx += spacing) {
      const x = gx + (r() * 2 - 1) * jitter * spacing;
      const z = gz + (r() * 2 - 1) * jitter * spacing;
      const roll = r();
      if (Math.hypot(x, z) > edge || !treeAt(x, z)) continue;
      const inGrove = grove(x, z) > WOODS.thick;
      if (!inGrove && roll > WOODS.lone) continue;
      const kind = r();
      const at = (t: TreePlacement) => ({ ...t, x: +t.x.toFixed(3), z: +t.z.toFixed(3) });
      if (inGrove && kind < BUSHES.share) {
        const color = pick(r, BUSH_COLORS);
        for (const [dx, dz, s] of BUSHES.clump)
          if (treeAt(x + dx, z + dz)) bush.push(at({ x: x + dx, z: z + dz, s, color }));
      } else if (pines(x, z) > WOODS.pines)
        pine.push(at({ x, z, s: +between(r, PINE_SIZE).toFixed(3) }));
      else if (r() < (inGrove ? APPLES.grove : APPLES.lone))
        apple.push(appleTreeAt(pick(r, TREES.apple), +x.toFixed(3), +z.toFixed(3)));
      else
        round.push(
          at({ x, z, s: +between(r, ROUND_SIZE).toFixed(3), color: pick(r, ROUND_COLORS) }),
        );
    }
  }

  if (!isWinter()) return { round, pine, bush, apple };
  const [r0, r1] = ROUND_SIZE;
  const [p0, p1] = PINE_SIZE;
  const bare = round.filter((t) => {
    if (pines(t.x, t.z) <= WOODS.winter) return true;
    pine.push({
      x: t.x,
      z: t.z,
      s: +(p0 + ((p1 - p0) * ((t.s ?? r0) - r0)) / (r1 - r0)).toFixed(3),
    });
    return false;
  });
  return { round: bare, pine, bush, apple };
}

export const OUTSKIRTS_TREES = growWoods();

type XZ = [number, number];

function outskirtsCopies<T>(
  sets: T[][],
  anchor: (set: T[]) => XZ,
  spotsOf: (set: T[]) => XZ[],
  shift: (item: T, from: XZ, to: XZ) => T,
): T[] {
  const r = random(SEED + 4);
  const trees = [
    ...OUTSKIRTS_TREES.round,
    ...OUTSKIRTS_TREES.apple,
    ...OUTSKIRTS_TREES.pine,
    ...OUTSKIRTS_TREES.bush,
  ];
  const out: T[] = [];
  const { spacing, edge } = PATCHES;
  for (let gz = -edge; gz <= edge; gz += spacing) {
    for (let gx = -edge; gx <= edge; gx += spacing) {
      const x = gx + (r() - 0.5) * spacing * 0.6;
      const z = gz + (r() - 0.5) * spacing * 0.6;
      const set = sets[Math.floor(r() * sets.length)];
      if (r() > PATCHES.share || Math.hypot(x, z) > edge) continue;
      const [cx, cz] = anchor(set);
      const moved = set.map((item) => shift(item, [cx, cz], [x, z]));
      const spots = spotsOf(moved);
      if (!spots.every(([fx, fz]) => grassAt(fx, fz))) continue;
      if (
        trees.some((t) =>
          spots.some(
            ([fx, fz]) => Math.hypot(t.x - fx, t.z - fz) < PATCHES.clear * (t.s ?? 1) * 0.5 + 1,
          ),
        )
      )
        continue;
      out.push(...moved);
    }
  }
  return out;
}

export function outskirtsPatches(own: FlowerPatch[]): FlowerPatch[] {
  return outskirtsCopies(
    Array.from({ length: Math.floor(own.length / 3) }, (_, i) => own.slice(i * 3, i * 3 + 3)),
    (set) => set[0].center,
    (set) =>
      set.flatMap((p) =>
        Array.from({ length: p.flowers.length / 5 }, (_, i): XZ => [
          p.flowers[i * 5],
          p.flowers[i * 5 + 1],
        ]),
      ),
    (p, [cx, cz], [x, z]) => ({
      center: [p.center[0] - cx + x, p.center[1] - cz + z],
      radius: p.radius,
      flowers: p.flowers.map((v, i) => (i % 5 === 0 ? v - cx + x : i % 5 === 1 ? v - cz + z : v)),
    }),
  );
}

export type Pile = { x: number; z: number; rx: number; rz: number; seed: number };

export function outskirtsPiles(own: Pile[][]): Pile[] {
  return outskirtsCopies(
    own,
    (set) => [set[0].x, set[0].z],
    (set) =>
      set.flatMap(({ x, z, rx, rz }): XZ[] => [
        [x, z],
        [x + rx, z],
        [x - rx, z],
        [x, z + rz],
        [x, z - rz],
      ]),
    (p, [cx, cz], [x, z]) => ({ ...p, x: p.x - cx + x, z: p.z - cz + z }),
  );
}

function smoothLoop(pts: [number, number][], steps: number): [number, number][] {
  const out: [number, number][] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const w = [-t3 + 2 * t2 - t, 3 * t3 - 5 * t2 + 2, -3 * t3 + 4 * t2 + t, t3 - t2].map(
        (v) => v / 2,
      );
      out.push(
        [0, 1].map((c) => w[0] * p0[c] + w[1] * p1[c] + w[2] * p2[c] + w[3] * p3[c]) as [
          number,
          number,
        ],
      );
    }
  }
  return out;
}

export type MeadowPatch = { outline: [number, number][]; color: string; lift: number };

function paintMeadow(): MeadowPatch[] {
  const r = random(SEED + 5);
  const { big, small, edge, lift } = MEADOW_PATCHES;
  const out: MeadowPatch[] = [];
  const lay = (
    spacing: number,
    size: readonly [number, number],
    squash: number,
    color: () => string,
    height: number,
  ) => {
    for (let gz = -edge; gz <= edge; gz += spacing) {
      for (let gx = -edge; gx <= edge; gx += spacing) {
        const x = gx + r() * spacing;
        const z = gz + r() * spacing;
        const across = between(r, size);
        const corners = Array.from({ length: 7 }, (_, i): [number, number] => {
          const a = (i / 7) * Math.PI * 2;
          const reach = across * (0.6 + 0.6 * r());
          return [x + reach * Math.cos(a), z + reach * Math.sin(a) * squash];
        });
        const paint = color();
        if (Math.hypot(x, z) > edge) continue;
        const outline = smoothLoop(corners, 6);

        if (!outline.every(([px, pz]) => grassAt(px, pz))) continue;
        out.push({ outline, color: paint, lift: height });
      }
    }
  };
  lay(big.spacing, big.size, 1, () => pick(r, big.colors), lift[0]);
  lay(
    small.spacing,
    small.size,
    small.squash,
    () => {
      const roll = r();
      return roll < small.share[0]
        ? small.colors[0]
        : roll < small.share[0] + small.share[1]
          ? small.colors[1]
          : small.colors[2];
    },
    lift[1],
  );
  return out;
}

export const OUTSKIRTS_MEADOW = paintMeadow();
