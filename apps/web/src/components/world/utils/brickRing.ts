import { BRICKS, COURSE, FACES, G, MORTAR, THICK } from "../constants/brickRing.constants";
import { hexRgb } from "./color";
import { rng } from "./random";
import { add, mul } from "./vec3";

type P3 = [number, number, number];

export type WallBox = { corners: P3[]; color: string };

function para(o: P3, a: P3, b: P3, c: P3, color: string): WallBox {
  const p = (i: number, j: number, k: number) => add(add(add(o, mul(a, i)), mul(b, j)), mul(c, k));
  return {
    color,
    corners: [
      p(0, 0, 0),
      p(1, 0, 0),
      p(1, 1, 0),
      p(0, 1, 0),
      p(0, 0, 1),
      p(1, 0, 1),
      p(1, 1, 1),
      p(0, 1, 1),
    ],
  };
}

const box = (x: number, y: number, z: number, w: number, d: number, h: number, color: string) =>
  para([x, y, z], [w, 0, 0], [0, d, 0], [0, 0, h], color);

export function stretchesFrom(n: number, open: [number, number][]): boolean[] {
  const shut = Array.from({ length: n }, () => true);
  for (const [first, last] of open) for (let i = first; i <= last; i++) shut[i] = false;
  return shut;
}

export function brickRing(
  cx: number,
  cy: number,
  r: number,
  cap: string,
  seed: number,
  shut: boolean[],
): WallBox[] {
  const n = shut.length;
  const random = rng(seed);
  const out: WallBox[] = [];
  const turn = (i: number) => (i / n) * Math.PI * 2;
  const at = (a: number): [number, number] => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

  const seg = (a0: number, a1: number, z0: number, h: number, th: number, color: string) => {
    const p0 = at(a0);
    const p1 = at(a1);
    const am = (a0 + a1) / 2;
    const nn: P3 = [Math.cos(am), Math.sin(am), 0];
    return para(
      [p0[0] - (nn[0] * th) / 2, p0[1] - (nn[1] * th) / 2, z0],
      [p1[0] - p0[0], p1[1] - p0[1], 0],
      mul(nn, th),
      [0, 0, h],
      color,
    );
  };
  for (let i = 0; i < n; i++) {
    if (!shut[i]) continue;
    const a0 = turn(i);
    const a1 = turn(i + 1);
    out.push(seg(a0, a1, G, 3 * COURSE, THICK - 0.05, MORTAR));
    for (let k = 0; k < 3; k++) {
      const off = k % 2 ? 0.5 : 0;
      const pieces = [
        [Math.max(a0, turn(i - 1 + off)), Math.min(a1, turn(i + off))],
        [Math.max(a0, turn(i + off)), Math.min(a1, turn(i + 1 + off))],
      ];
      const gap = 0.012 / r;
      for (const [u0, u1] of pieces) {
        if (u1 - u0 > 2 * gap) {
          const color = BRICKS[Math.floor(random() * BRICKS.length)];
          out.push(seg(u0 + gap, u1 - gap, G + k * COURSE + 0.008, COURSE - 0.016, THICK, color));
        }
      }
    }
    out.push(seg(a0, a1, G + 3 * COURSE, 0.07, THICK + 0.07, cap));
  }

  for (let i = 0; i < n; i++) {
    if (shut[i] === shut[(i + 1) % n]) continue;
    const a = turn((i + 1) % n);
    const [px, py] = at(a);
    const side = shut[i] ? -1 : 1;
    const tangent = [-Math.sin(a) * side, Math.cos(a) * side];
    const q = 0.42;
    const qx = px - tangent[0] * q * 0.5;
    const qy = py - tangent[1] * q * 0.5;
    out.push(
      box(qx - q / 2, qy - q / 2, G, q, q, 0.62, BRICKS[0]),
      box(qx - q / 2 - 0.04, qy - q / 2 - 0.04, G + 0.62, q + 0.08, q + 0.08, 0.08, cap),
    );
  }
  return out;
}

function linear(hex: string): P3 {
  const c = hexRgb(hex).map((v) => v / 255);
  return c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as P3;
}

export function boxesToMesh(boxes: WallBox[]) {
  const position: number[] = [];
  const normal: number[] = [];
  const color: number[] = [];
  const site = (p: P3): P3 => [p[0], p[2] - G, p[1]];
  for (const { corners, color: hex } of boxes) {
    const rgb = linear(hex);
    const pts = corners.map(site);
    const middle = mul(pts.reduce(add, [0, 0, 0]), 1 / 8);
    for (const face of FACES) {
      let quad = face.map((i) => pts[i]);

      const [a, b, c] = quad;
      const u: P3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v: P3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      let nx = u[1] * v[2] - u[2] * v[1];
      let ny = u[2] * v[0] - u[0] * v[2];
      let nz = u[0] * v[1] - u[1] * v[0];
      const centre = mul(quad.reduce(add, [0, 0, 0]), 1 / 4);
      const outward =
        (centre[0] - middle[0]) * nx + (centre[1] - middle[1]) * ny + (centre[2] - middle[2]) * nz;
      if (outward < 0) {
        quad = quad.slice().reverse();
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      const length = Math.hypot(nx, ny, nz) || 1;
      for (const i of [0, 1, 2, 0, 2, 3]) {
        position.push(...quad[i]);
        normal.push(nx / length, ny / length, nz / length);
        color.push(...rgb);
      }
    }
  }
  return {
    position: new Float32Array(position),
    normal: new Float32Array(normal),
    color: new Float32Array(color),
  };
}
