import { BufferGeometry, Color, Float32BufferAttribute, SRGBColorSpace } from "three";
import type { TreePlacement, Trees } from "../constants/treeLayout.constants";
import {
  APPLE_PROFILE,
  APPLE_SIDES,
  APPLE_SKIN,
  APPLE_STALK,
  BARE,
  BARE_GARDEN,
  CrownShape,
  FADE,
  GROUND,
  IN_SEASON,
  P,
  SHADE,
  SNOW,
  SUN,
  VIEW,
  WINTER_LEAF,
} from "../constants/foliageMesh.constants";
import type { RGB, V3 } from "../constants/foliageMesh.constants";
import { SWAY } from "../constants/wind.constants";
import { isWinter } from "./season";

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

const hexRgb = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const rgbHex = (c: RGB) =>
  "#" +
  c
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
const mixc = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => v + (b[i] - v) * t) as RGB;
const tint = (a: string, b: string, k: number) => rgbHex(mixc(hexRgb(a), hexRgb(b), k));
const dk = (c: string, k = 0.3) => rgbHex(mixc(hexRgb(c), [40, 30, 34], k));

const SNOW_LIGHT = hexRgb(SNOW.light);
const SNOW_SHADE = hexRgb(SNOW.shade);

function snowOn(c: RGB, n: V3): RGB {
  const up = n[2];
  const f = Math.min(1, Math.max(0, (up - SNOW.from) / (SNOW.to - SNOW.from)));
  const snow = mixc(SNOW_SHADE, SNOW_LIGHT, Math.min(1, Math.max(0, up)));
  return mixc(c, snow, f * f * (3 - 2 * f) * SNOW.most);
}

function shade(hex: string, n: V3): RGB {
  const c = hexRgb(hex);
  const t = n[2] * n[2] - n[0] * n[0];
  const lit = t >= 0 ? mixc(c, SUN, 0.2 * t) : mixc(c, SHADE, 0.34 * -t);
  return mixc(lit, SUN, 0.07 * n[1] * n[1]);
}

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Mesh {
  positions: number[] = [];
  colors: number[] = [];
  sway: number[] = [];
  fade = 0;

  snowy = false;

  foot: V3 = [0, 0, 0];
  private color = new Color();

  face(pts: V3[], n: V3, hex: string) {
    let rgb = mixc(shade(hex, n), FADE, this.fade);
    if (this.snowy) rgb = snowOn(rgb, n);
    this.color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, SRGBColorSpace);
    const mid = mul(pts.reduce(add, [0, 0, 0] as V3), 1 / pts.length);
    for (let i = 0; i < pts.length; i++) {
      for (const p of [mid, pts[i], pts[(i + 1) % pts.length]]) {
        this.positions.push(p[0], p[2] - GROUND, p[1]);
        this.colors.push(this.color.r, this.color.g, this.color.b);
        this.sway.push(this.foot[0], this.foot[1], this.foot[2]);
      }
    }
  }

  smoothFace(pts: V3[], ns: V3[], hexes: string[]) {
    const tone = (n: V3, hex: string) => {
      let rgb = mixc(shade(hex, n), FADE, this.fade);
      if (this.snowy) rgb = snowOn(rgb, n);
      return new Color().setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, SRGBColorSpace);
    };
    const tones = pts.map((_, i) => tone(ns[i], hexes[i]));
    const mid = mul(pts.reduce(add, [0, 0, 0] as V3), 1 / pts.length);
    const middle = tones
      .reduce((c, t) => c.add(t), new Color(0, 0, 0))
      .multiplyScalar(1 / tones.length);
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      for (const [p, c] of [
        [mid, middle],
        [pts[i], tones[i]],
        [pts[j], tones[j]],
      ] as [V3, Color][]) {
        this.positions.push(p[0], p[2] - GROUND, p[1]);
        this.colors.push(c.r, c.g, c.b);
        this.sway.push(this.foot[0], this.foot[1], this.foot[2]);
      }
    }
  }

  geometry() {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute("color", new Float32BufferAttribute(this.colors, 3));
    geometry.setAttribute("sway", new Float32BufferAttribute(this.sway, 3));
    geometry.computeBoundingSphere();
    return geometry;
  }
}

function frustum(
  m: Mesh,
  cx: number,
  cy: number,
  z0: number,
  r0: number,
  z1: number,
  r1: number,
  color: string,
  n: number,
  ph = 0,
) {
  const at = (a: number, r: number, z: number): V3 => [
    cx + r * Math.cos(a),
    cy + r * Math.sin(a),
    z,
  ];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + ph;
    const a1 = ((i + 1) / n) * Math.PI * 2 + ph;
    const mid = (a0 + a1) / 2;
    const normal = unit([Math.cos(mid), Math.sin(mid), (r0 - r1) / (z1 - z0 || 1)]);
    m.face([at(a0, r0, z0), at(a1, r0, z0), at(a1, r1, z1), at(a0, r1, z1)], normal, color);
  }
  const ring = (r: number, z: number) =>
    Array.from({ length: n }, (_, i) => at((i / n) * Math.PI * 2 + ph, r, z));
  if (r1 > 0.002) m.face(ring(r1, z1), [0, 0, 1], color);
  if (r0 > 0.002) m.face(ring(r0, z0).reverse(), [0, 0, -1], color);
}

function blob(
  m: Mesh,
  cx: number,
  cy: number,
  zc: number,
  r: number,
  color: string,
  n = 12,
  ph = 0.2,
  zs = 1,
) {
  const angles = [-55, -20, 15, 48, 78, 90].map((d) => (d * Math.PI) / 180);
  for (let i = 0; i < angles.length - 1; i++) {
    const [a0, a1] = [angles[i], angles[i + 1]];
    frustum(
      m,
      cx,
      cy,
      zc + r * Math.sin(a0) * zs,
      r * Math.cos(a0),
      zc + r * Math.sin(a1) * zs,
      Math.max(0.001, r * Math.cos(a1)),
      color,
      n,
      ph,
    );
  }
}

function roundedBlock(
  m: Mesh,
  c: V3,
  hx: number,
  hy: number,
  radius: number,
  z0: number,
  z1: number,
  color: string,
) {
  const outline: [number, number][] = [];
  const corners: [number, number, number][] = [
    [c[0] + hx - radius, c[1] + hy - radius, 0],
    [c[0] - hx + radius, c[1] + hy - radius, Math.PI / 2],
    [c[0] - hx + radius, c[1] - hy + radius, Math.PI],
    [c[0] + hx - radius, c[1] - hy + radius, (3 * Math.PI) / 2],
  ];
  for (const [x, y, start] of corners) {
    for (let k = 0; k <= 4; k++) {
      const a = start + (k / 4) * (Math.PI / 2);
      outline.push([x + radius * Math.cos(a), y + radius * Math.sin(a)]);
    }
  }
  outline.forEach(([x0, y0], i) => {
    const [x1, y1] = outline[(i + 1) % outline.length];
    m.face(
      [
        [x0, y0, z0],
        [x1, y1, z0],
        [x1, y1, z1],
        [x0, y0, z1],
      ],
      unit([y1 - y0, x0 - x1, 0]),
      color,
    );
  });
  m.face(
    outline.map(([x, y]) => [x, y, z1] as V3),
    [0, 0, 1],
    color,
  );
}

function flowerFacing(m: Mesh, c: V3, nn: V3, n: number, r: number, petal: string, centre: string) {
  const e1 = unit(cross(nn, Math.abs(nn[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]));
  const e2 = cross(nn, e1);
  const at = (u: number, v: number, lift = 0) =>
    add(add(add(c, mul(e1, u)), mul(e2, v)), mul(nn, lift));
  const count = n * 4;
  const petals: V3[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const rr = r * (0.3 + 0.7 * Math.pow(Math.abs(Math.cos((n * a) / 2)), 0.7));
    petals.push(at(rr * Math.cos(a), rr * Math.sin(a)));
  }
  const mid: V3[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    mid.push(at(r * 0.3 * Math.cos(a), r * 0.3 * Math.sin(a), r * 0.04));
  }
  m.face(petals, nn, petal);
  m.face(mid, nn, centre);
}

type LeafOptions = {
  N?: number;

  L?: number;

  floor?: number;

  needles?: boolean;

  back?: number;

  lift?: number;

  coreK?: number;

  cone?: [number, number, number, number];

  flowers?: [string, string];
  bloomP?: number;
  bloomGap?: number;
  bloomR?: number;
};

function leafMass(m: Mesh, c0: V3, ax: V3, shape: CrownShape, color: string, o: LeafOptions = {}) {
  const box = shape === CrownShape.Box;
  const cone = shape === CrownShape.Cone ? o.cone : undefined;
  const r = cone ? cone[0] : Math.max(ax[0], ax[1]);
  const floor = o.floor ?? -Infinity;
  const rnd = rng(
    (Math.round(c0[0] * 977 + c0[1] * 331 + c0[2] * 71 + r * 1000) * 2654435761) >>> 0,
  );

  const winter = isWinter() && (color === P.leaf || color === P.leafDeep || color === P.leafLight);
  const W = WINTER_LEAF;
  const leaf = o.needles
    ? tint(color, "#3f8a3e", 0.3)
    : winter
      ? tint(color, W.toward, W.by)
      : tint(color, "#9fd23a", 0.55);
  const core = dk(leaf, 0.2);
  const tones = o.needles
    ? [
        tint(leaf, "#7fb84e", 0.3),
        leaf,
        dk(leaf, 0.1),
        tint(leaf, "#5fa047", 0.4),
        tint(leaf, "#9cc95a", 0.2),
      ]
    : winter
      ? [
          tint(leaf, W.frost, 0.3),
          leaf,
          dk(leaf, 0.08),
          tint(leaf, W.sage, 0.45),
          tint(leaf, W.frost, 0.12),
          tint(leaf, W.deep, 0.4),
        ]
      : [
          tint(leaf, "#e4f57a", 0.35),
          leaf,
          dk(leaf, 0.08),
          tint(leaf, "#b8e04a", 0.5),
          tint(leaf, "#e4f57a", 0.15),
          tint(leaf, "#7fbf34", 0.4),
        ];

  if (cone) {
    frustum(
      m,
      c0[0],
      c0[1],
      cone[2],
      cone[0] * 0.9,
      cone[3] - (cone[3] - cone[2]) * 0.06,
      Math.max(0.001, cone[1] * 0.9),
      core,
      12,
    );
  } else if (box) {
    roundedBlock(
      m,
      c0,
      ax[0] * 0.86,
      ax[1] * 0.86,
      ax[0] * 0.35,
      Math.max(floor, c0[2] - ax[2]),
      c0[2] + ax[2] * 0.82,
      core,
    );
  } else {
    blob(m, c0[0], c0[1], c0[2], r * (o.coreK ?? 0.86), core, 12, 0.2, (ax[2] / r) * 0.96);
  }

  const N = o.N ?? 300;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const L = r * (o.L ?? 0.22);
  const blooms: V3[] = [];

  const spots: [V3, V3][] = [];
  for (let i = 0; i < N; i++) {
    let p: V3;
    let n: V3;
    if (cone) {
      const [rb, rt, zb, zt] = cone;
      const share = (i + 0.5) / N;
      const hh =
        rb > rt ? (rb - Math.sqrt(rb * rb - share * (rb * rb - rt * rt))) / (rb - rt) : share;
      const R = rb + (rt - rb) * hh;
      const a = golden * i;
      p = [c0[0] + R * Math.cos(a), c0[1] + R * Math.sin(a), zb + (zt - zb) * hh];
      n = unit([Math.cos(a), Math.sin(a), (rb - rt) / (zt - zb)]);
    } else {
      const zz = 1 - (2 * (i + 0.5)) / N;
      const rr = Math.sqrt(1 - zz * zz);
      const d: V3 = [Math.cos(golden * i) * rr, Math.sin(golden * i) * rr, zz];
      let u = d;
      if (box) {
        const q = Math.pow(
          d.reduce((t, v) => t + Math.pow(Math.abs(v), 6), 0),
          1 / 6,
        );
        u = d.map((v) => v / q) as V3;
        n = unit(u.map((v, j) => (Math.sign(v) * Math.pow(Math.abs(v), 5)) / ax[j]) as V3);
      } else {
        n = unit(d.map((v, j) => v / ax[j]) as V3);
      }
      p = [c0[0] + u[0] * ax[0], c0[1] + u[1] * ax[1], c0[2] + u[2] * ax[2]];
    }

    if (p[2] >= floor + 0.015) spots.push([p, n]);
  }

  const sprout = (p: V3, n: V3, rand: () => number, front: boolean) => {
    const t1 = unit(cross(n, Math.abs(n[2]) > 0.95 ? [1, 0, 0] : [0, 0, 1]));
    const t2 = cross(n, t1);
    const a = (rand() - 0.5) * (o.needles ? 1.2 : 2.2);
    const dl = unit(
      add(
        add(mul(t2, Math.cos(a)), mul(t1, Math.sin(a))),
        mul(n, o.lift ?? (o.needles ? 0.32 : 0.22)),
      ),
    );
    const sd = unit(cross(n, dl));
    const l = L * (0.8 + 0.4 * rand());
    const w = l * (o.needles ? 0.3 : 0.52);
    const at = (f: number, sw: number) => add(add(p, mul(dl, l * (f - 0.2))), mul(sd, sw * w));
    let ln = unit(cross(dl, sd));
    if (dot(ln, n) < 0) ln = mul(ln, -1);

    if (front && dot(ln, VIEW) <= 0.02) return;
    const tone = tones[Math.floor(rand() * tones.length)];
    m.face(
      [
        add(p, mul(dl, -l * 0.2)),
        at(0.3, 0.42),
        at(0.62, 0.5),
        add(p, mul(dl, l * 0.8)),
        at(0.62, -0.5),
        at(0.3, -0.42),
      ],
      ln,
      tone,
    );

    if (
      o.flowers &&
      (front ? dot(n, VIEW) > 0.15 : dot(n, VIEW) < -0.15) &&
      p[2] > c0[2] - ax[2] * 0.6 &&
      rand() < (o.bloomP ?? 0.2) &&
      blooms.every(
        (b) => Math.hypot(b[0] - p[0], b[1] - p[1], b[2] - p[2]) > r * (o.bloomGap ?? 0.36),
      )
    ) {
      blooms.push(p);
      flowerFacing(
        m,
        add(p, mul(n, r * 0.05)),
        n,
        5,
        r * (o.bloomR ?? 0.15),
        o.flowers[0],
        o.flowers[1],
      );
    }
  };

  const back = o.back ?? -0.3;
  for (const [p, n] of spots) if (dot(n, VIEW) >= back) sprout(p, n, rnd, true);
  const behind = rng(
    (Math.round(c0[0] * 613 + c0[1] * 457 + c0[2] * 97 + r * 1000) * 2654435761) >>> 0,
  );
  for (const [p, n] of spots) if (dot(n, VIEW) < back) sprout(p, n, behind, false);
}

export function fallingLeafTones(color: string = P.leaf): string[] {
  const leaf = tint(color, "#9fd23a", 0.55);
  return [
    tint(leaf, "#e4f57a", 0.45),
    tint(leaf, "#e4f57a", 0.25),
    tint(leaf, "#b8e04a", 0.55),
    tint(leaf, "#e9c46f", 0.5),
    tint(leaf, "#f0b04c", 0.6),
  ];
}

function tree(m: Mesh, cx: number, cy: number, z: number, s = 1) {
  frustum(m, cx, cy, z, 0.16 * s, z + 1.25 * s, 0.1 * s, P.trunk, 8);
  const lobes: [number, number, number, number, string][] = [
    [-0.32, -0.25, 1.3, 0.55, P.leafDeep],
    [0.32, -0.12, 1.25, 0.5, P.leafDeep],
    [-0.12, 0.34, 1.2, 0.5, P.leaf],
    [0.0, 0.0, 1.65, 0.64, P.leaf],
    [0.24, 0.26, 2.0, 0.42, P.leafLight],
    [-0.26, 0.05, 2.08, 0.38, P.leafLight],
  ];
  for (const [dx, dy, dz, r, c] of lobes) {
    leafMass(
      m,
      [cx + dx * s, cy + dy * s, z + dz * s],
      [r * s, r * s, r * s * 0.92],
      CrownShape.Ball,
      c,
      {
        N: 240,
        L: 0.27,
        back: -0.12,
        lift: 0.12,
        coreK: 0.97,
      },
    );
  }
}

function roundTree(m: Mesh, x: number, y: number, z: number, s = 1, c = P.leaf) {
  frustum(m, x, y, z, 0.12 * s, z + 0.75 * s, 0.08 * s, P.trunk, 7);
  const leafy = { back: -0.12, lift: 0.12, coreK: 0.97 };
  leafMass(m, [x, y, z + 1.08 * s], [0.56 * s, 0.56 * s, 0.53 * s], CrownShape.Ball, c, {
    N: 340,
    L: 0.24,
    ...leafy,
  });
  leafMass(
    m,
    [x + 0.14 * s, y + 0.12 * s, z + 1.42 * s],
    [0.32 * s, 0.32 * s, 0.3 * s],
    CrownShape.Ball,
    P.leafLight,
    { N: 150, L: 0.3, ...leafy },
  );
}

function pine(m: Mesh, x: number, y: number, z: number, s = 1) {
  frustum(m, x, y, z, 0.09 * s, z + 0.45 * s, 0.07 * s, P.trunk, 6);

  const tier = (z0: number, r0: number, z1: number, r1: number, c: string, N: number) =>
    leafMass(m, [x, y, 0], [0, 0, 0], CrownShape.Cone, c, {
      cone: [r0, r1, z0, z1],
      N,
      L: 0.36,
      needles: true,
    });
  tier(z + 0.38 * s, 0.56 * s, z + 1.1 * s, 0.16 * s, P.leafDeep, 170);
  tier(z + 0.88 * s, 0.43 * s, z + 1.62 * s, 0.11 * s, P.leafDeep, 130);
  tier(z + 1.36 * s, 0.29 * s, z + 2.1 * s, 0.02 * s, P.leaf, 90);
}

function leafyShrub(
  m: Mesh,
  cx: number,
  cy: number,
  z: number,
  r: number,
  shape: CrownShape.Ball | CrownShape.Box,
  color: string,
  flowers?: [string, string],
) {
  const box = shape === CrownShape.Box;
  const ax: V3 = box ? [r * 1.05, r * 0.92, r * 0.72] : [r * 0.9, r * 0.9, r * 0.8];
  leafMass(m, [cx, cy, z + ax[2] * (box ? 1 : 0.94)], ax, shape, color, {
    N: Math.round((box ? 520 : 420) * (r < 0.3 ? 0.75 : 1)),
    L: box ? 0.19 : 0.2,
    floor: z,
    flowers,
  });
}

function limb(m: Mesh, a: V3, b: V3, r0: number, r1: number, color: string, n = 6) {
  const d = unit(add(b, mul(a, -1)));
  const e1 = unit(Math.abs(d[2]) < 0.95 ? cross(d, [0, 0, 1]) : cross(d, [1, 0, 0]));
  const e2 = cross(d, e1);
  const out = (t: number) => add(mul(e1, Math.cos(t)), mul(e2, Math.sin(t)));
  for (let i = 0; i < n; i++) {
    const [o0, o1] = [out((i / n) * Math.PI * 2), out(((i + 1) / n) * Math.PI * 2)];
    const c = unit(add(o0, o1))[2] > BARE.snowy ? BARE.snow : color;
    m.smoothFace(
      [add(a, mul(o0, r0)), add(a, mul(o1, r0)), add(b, mul(o1, r1)), add(b, mul(o0, r1))],
      [o0, o1, o1, o0],
      [c, c, c, c],
    );
  }
}

function bareTree(m: Mesh, x: number, y: number, z: number, s = 1, wide = false) {
  const B = BARE;
  const r = rng((Math.round(x * 97 + y * 53) * 2654435761) >>> 0);
  const top = z + (wide ? 0.6 : 0.72) * s;
  frustum(m, x, y, z, 0.12 * s, top, 0.085 * s, B.bark, 12);

  const grow = (a: V3, dir: V3, len: number, r0: number, depth: number) => {
    const b = add(a, mul(dir, len));
    const r1 = r0 * 0.6;
    limb(m, a, b, r0, r1, depth ? B.twig : B.bark, depth > 1 ? 5 : 6);
    if (depth >= 2) return;
    const e1 = unit(Math.abs(dir[2]) < 0.95 ? cross(dir, [0, 0, 1]) : cross(dir, [1, 0, 0]));
    const e2 = cross(dir, e1);
    const k = B.split[depth];
    const turn0 = r() * Math.PI * 2;
    for (let i = 0; i < k; i++) {
      const turn = turn0 + (i / k) * Math.PI * 2 + (r() - 0.5) * 0.6;
      const open = B.open[0] + r() * B.open[1];
      const side = add(mul(e1, Math.cos(turn)), mul(e2, Math.sin(turn)));
      const next = unit(add(add(mul(dir, Math.cos(open)), mul(side, Math.sin(open))), [0, 0, 0.2]));
      grow(b, next, len * (B.shorter[0] + r() * B.shorter[1]), r1, depth + 1);
    }

    if (depth === 0) blob(m, b[0], b[1], b[2] + r1 * 0.9, r1 * 2.4, B.snow, 8, 0.2, 0.55);
  };
  const n = B.limbs + (wide || r() < 0.5 ? 1 : 0);
  const a0 = r() * Math.PI * 2;
  const reach = B.reach[wide ? 1 : 0];
  const len = B.length[wide ? 1 : 0] * s;
  for (let i = 0; i < n; i++) {
    const az = a0 + (i / n) * Math.PI * 2 + (r() - 0.5) * 0.5;
    const el = reach + (r() - 0.5) * 0.25;
    const dir: V3 = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
    grow([x, y, top - 0.05 * s], dir, len * (0.9 + r() * 0.2), B.thick * s, 0);
  }
  grow(
    [x, y, top - 0.02 * s],
    unit([r() * 0.2 - 0.1, r() * 0.2 - 0.1, 1]),
    len * 1.05,
    B.thick * 1.05 * s,
    0,
  );
}

function appleTree(m: Mesh, x: number, y: number, z: number, s: number) {
  frustum(m, x, y, z, 0.14 * s, z + 0.66 * s, 0.09 * s, P.trunk, 7);
  const leafy = { back: -0.12, lift: 0.12, coreK: 0.97 };
  leafMass(m, [x, y, z + 0.98 * s], [0.66 * s, 0.66 * s, 0.5 * s], CrownShape.Ball, P.leaf, {
    N: 380,
    L: 0.22,
    ...leafy,
  });
  leafMass(
    m,
    [x - 0.1 * s, y + 0.16 * s, z + 1.3 * s],
    [0.36 * s, 0.36 * s, 0.28 * s],
    CrownShape.Ball,
    P.leafLight,
    { N: 160, L: 0.28, ...leafy },
  );
}

function apple(m: Mesh, cx: number, cy: number, zc: number, r: number, color: string) {
  const n = APPLE_SIDES;
  const prof = APPLE_PROFILE;
  const last = prof.length - 1;
  const at = (a: number, [out, up]: [number, number]): V3 => [
    cx + out * r * Math.cos(a),
    cy + out * r * Math.sin(a),
    zc + up * r,
  ];

  const outward = prof.map((_, j) => {
    const [p, q] = [prof[Math.max(0, j - 1)], prof[Math.min(last, j + 1)]];
    const [dOut, dUp] = [q[0] - p[0], q[1] - p[1]];
    const l = Math.hypot(dOut, dUp) || 1;
    return [dUp / l, -dOut / l] as [number, number];
  });

  const red = tint(color, APPLE_SKIN.crimson, 0.35);
  const skin = (j: number, i: number) => {
    const up = prof[j][1];
    const base =
      j >= last - 2
        ? APPLE_SKIN.hollow
        : j >= last - 4
          ? tint(red, APPLE_SKIN.gold, 0.35)
          : up < -0.25
            ? tint(red, APPLE_SKIN.deep, Math.min(1, (-0.25 - up) * 1.4))
            : up > 0.5
              ? tint(red, APPLE_SKIN.gold, (up - 0.5) * 0.35)
              : red;
    const streak = j > 1 && j < last - 3 ? (0.5 + 0.5 * Math.sin(i * 2.9 + j * 0.25)) ** 3 : 0;
    return tint(base, APPLE_SKIN.streak, 0.6 * streak);
  };
  for (let j = 0; j < last; j++) {
    for (let i = 0; i < n; i++) {
      const corners: [number, number][] = [
        [i, j],
        [i + 1, j],
        [i + 1, j + 1],
        [i, j + 1],
      ];
      const keep = corners.filter(([, jj]) => prof[jj][0] > 1e-6 || jj === j || jj === j + 1);
      const pts: V3[] = [];
      const ns: V3[] = [];
      const hexes: string[] = [];
      for (const [ii, jj] of keep) {
        if (prof[jj][0] < 1e-6 && pts.some((_, k) => keep[k][1] === jj)) continue;
        const a = (ii / n) * Math.PI * 2;
        pts.push(at(a, prof[jj]));
        ns.push([outward[jj][0] * Math.cos(a), outward[jj][0] * Math.sin(a), outward[jj][1]]);
        hexes.push(skin(jj, ii % n));
      }
      m.smoothFace(pts, ns, hexes);
    }
  }

  const path = APPLE_STALK.path.map(([out, up]): V3 => [cx + out * r, cy, zc + up * r]);
  const w = (APPLE_STALK.width * r) / 2;
  for (let k = 0; k + 1 < path.length; k++) {
    const [a, b] = [path[k], path[k + 1]];
    const along = unit(add(b, mul(a, -1)));
    const side = unit(cross(along, [0, 1, 0]));
    const back: V3 = [0, 1, 0];
    const corners = (c: V3) => [
      add(add(c, mul(side, w)), mul(back, w)),
      add(add(c, mul(side, -w)), mul(back, w)),
      add(add(c, mul(side, -w)), mul(back, -w)),
      add(add(c, mul(side, w)), mul(back, -w)),
    ];
    const [A, B] = [corners(a), corners(b)];
    const color = k === path.length - 2 ? APPLE_STALK.tip : APPLE_STALK.color;
    for (let i = 0; i < 4; i++) {
      const i1 = (i + 1) % 4;
      const out = unit(add(add(A[i], A[i1]), mul(add(a, a), -1)));
      m.face([A[i], A[i1], B[i1], B[i]], out, color);
    }
    if (k === path.length - 2) m.face(B, along, APPLE_STALK.tip);
  }
}

export function appleGeometry(radius: number, color: string) {
  const m = new Mesh();
  apple(m, 0, 0, GROUND, radius, color);
  return m.geometry();
}

function hydrangea(m: Mesh, cx: number, cy: number, z: number, r: number, color: string) {
  const centre = color === P.hydBlue || color === P.hydViolet ? P.white : P.yellow;
  leafyShrub(
    m,
    cx,
    cy,
    z,
    r,
    color === P.hydBlue ? CrownShape.Box : CrownShape.Ball,
    tint(P.leaf, P.leafLight, 0.6),
    [color, centre],
  );
}

export function buildFoliage(trees: Trees) {
  const m = new Mesh();

  const winter = isWinter();
  m.snowy = winter;
  const place = (
    t: TreePlacement,
    sway: number,
    draw: (x: number, y: number, z: number) => void,
  ) => {
    m.fade = t.fade ?? 0;
    m.foot = [t.x, t.z, sway];
    draw(t.x, t.z, (t.y ?? 0) + GROUND);
  };

  const hue = (c: string | undefined) => (c ? (IN_SEASON[c] ?? c) : c);
  for (const t of trees.leafy)
    place(t, SWAY.leafy, (x, y, z) =>
      winter ? bareTree(m, x, y, z, (t.s ?? 1) * BARE_GARDEN) : tree(m, x, y, z, t.s),
    );
  for (const t of trees.round)
    place(t, SWAY.round, (x, y, z) =>
      winter ? bareTree(m, x, y, z, t.s) : roundTree(m, x, y, z, t.s, t.color),
    );

  for (const t of trees.apple)
    place(t, SWAY.apple, (x, y, z) => {
      if (winter) return bareTree(m, x, y, z, t.s, true);
      appleTree(m, x, y, z, t.s);
      for (const [ax, ay, az, color] of t.fallen) apple(m, ax, az, ay + GROUND, 0.065 * t.s, color);
    });
  for (const t of trees.pine) place(t, SWAY.pine, (x, y, z) => pine(m, x, y, z, t.s));

  for (const t of trees.bush)
    place(t, t.y ? SWAY.garden : SWAY.bush, (x, y, z) =>
      leafyShrub(m, x, y, z, t.s ?? 0.34, CrownShape.Ball, hue(t.color) ?? P.leafLight),
    );
  for (const t of trees.hydrangea)
    place(t, SWAY.garden, (x, y, z) =>
      hydrangea(m, x, y, z, t.s ?? 0.42, hue(t.color) ?? P.hydBlue),
    );
  return m.geometry();
}
