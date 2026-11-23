import { Vector3 } from "three";
import {
  Axis,
  CLEAR,
  CROSS,
  KNOT_DROP,
  LENGTH,
  POINTS,
  WOOD,
} from "../constants/kendamaString.constants";

function gap(p: Vector3): number {
  let best = Infinity;
  for (const [axis, a0, r0, a1, r1] of WOOD) {
    const a = axis === Axis.Z ? p.z : p.x;
    const r = axis === Axis.Z ? Math.hypot(p.x, p.y) : Math.hypot(p.y, p.z - CROSS.z);
    const c = Math.min(a1, Math.max(a0, a));
    const R = r0 + ((r1 - r0) * (c - a0)) / (a1 - a0);
    best = Math.min(best, a === c ? r - R : Math.hypot(a - c, Math.max(0, r - R)));
  }
  return best;
}

function behind(ball: Vector3): number {
  const k = Math.min(1, Math.max(0, -ball.y / 0.25));
  return k * k * (3 - 2 * k);
}

function knot(ball: Vector3): Vector3 {
  let d: [number, number] = [0.79, 0.62];
  if (ball.y < 0) {
    const v = [ball.y, Math.max(ball.z - CROSS.z, KNOT_DROP * ball.y)],
      l = Math.hypot(v[0], v[1]),
      s = behind(ball);
    const m = [d[0] + (v[0] / l - d[0]) * s, d[1] + (v[1] / l - d[1]) * s],
      ml = Math.hypot(m[0], m[1]);
    d = ml > 1e-3 ? [m[0] / ml, m[1] / ml] : [v[0] / l, v[1] / l];
  }
  const top = Math.min(
    1,
    Math.max(0, (45 - Math.abs((Math.atan2(d[1], d[0]) * 180) / Math.PI - 90)) / 20),
  );
  return new Vector3(
    0.22 * top * Math.max(-1, Math.min(1, ball.x / 0.3)),
    CROSS.r * d[0],
    CROSS.z + CROSS.r * d[1],
  );
}

const length = (pts: Vector3[]) =>
  pts.reduce((s, p, k) => (k ? s + p.distanceTo(pts[k - 1]) : 0), 0);

function slack(a: Vector3, ball: Vector3): Vector3[] {
  const near = Math.abs(ball.x) < 0.2 && ball.z > 2.8;
  const s = near ? Math.max(0, LENGTH - a.distanceTo(ball)) : 0;
  const mid = a
    .clone()
    .add(ball)
    .multiplyScalar(0.5)
    .add(new Vector3(0.15, 0.75, -0.45).multiplyScalar(s));
  return Array.from({ length: POINTS }, (_, k) => {
    const t = k / (POINTS - 1),
      u = 1 - t;
    return a
      .clone()
      .multiplyScalar(u * u)
      .addScaledVector(mid, 2 * u * t)
      .addScaledVector(ball, t * t);
  });
}

function bend(a: Vector3, ball: Vector3, dir: Vector3, h: number): Vector3[] {
  const c = ball.clone().sub(a);
  const q1 = a
    .clone()
    .addScaledVector(c, 1 / 3)
    .addScaledVector(dir, 0.85 * h);
  const q2 = a
    .clone()
    .addScaledVector(c, 2 / 3)
    .addScaledVector(dir, 1.15 * h);
  return Array.from({ length: POINTS }, (_, k) => {
    const t = k / (POINTS - 1),
      u = 1 - t;
    return a
      .clone()
      .multiplyScalar(u * u * u)
      .addScaledVector(q1, 3 * u * u * t)
      .addScaledVector(q2, 3 * u * t * t)
      .addScaledVector(ball, t * t * t);
  });
}

function fit(a: Vector3, ball: Vector3, dir: Vector3): Vector3[] {
  let lo = 0,
    hi = 0.9;
  if (length(bend(a, ball, dir, hi)) <= LENGTH) lo = hi;
  else if (a.distanceTo(ball) < LENGTH)
    for (let i = 0; i < 30; i++) {
      const m = (lo + hi) / 2;
      if (length(bend(a, ball, dir, m)) < LENGTH) lo = m;
      else hi = m;
    }
  return bend(a, ball, dir, lo);
}

function clearance(pts: Vector3[]): number {
  let along = 0;
  let least = Infinity;
  const half = new Vector3();
  for (let k = 1; k < pts.length; k++) {
    const l = pts[k].distanceTo(pts[k - 1]);
    half
      .copy(pts[k])
      .add(pts[k - 1])
      .multiplyScalar(0.5);
    for (const [p, s] of [
      [half, along + l / 2],
      [pts[k], along + l],
    ] as const)
      if (s > CLEAR.from)
        least = Math.min(
          least,
          gap(p) - Math.min(CLEAR.most, CLEAR.near + CLEAR.ramp * (s - CLEAR.from)),
        );
    along += l;
  }
  return least;
}

function swinging(a: Vector3, ball: Vector3, heading: Vector3): Vector3[] {
  const cu = ball.clone().sub(a).normalize();

  const w = heading
    .clone()
    .normalize()
    .negate()
    .add(new Vector3(0, 0.5 - behind(ball), -0.45));
  w.addScaledVector(cu, -w.dot(cu));
  if (w.lengthSq() > 1e-12) w.normalize();
  else w.set(0, ball.y < 0 ? -1 : 1, 0);

  const side = new Vector3().crossVectors(cu, w);
  let best: Vector3[] = [];
  let bestClear = -Infinity;
  for (let k = 0; k <= 12; k++)
    for (const sg of k ? [1, -1] : [1]) {
      const ang = (15 * k * sg * Math.PI) / 180;
      const pts = fit(
        a,
        ball,
        w.clone().multiplyScalar(Math.cos(ang)).addScaledVector(side, Math.sin(ang)),
      );
      const c = clearance(pts);
      if (c > 0) return pts;
      if (c > bestClear) {
        bestClear = c;
        best = pts;
      }
    }
  return best;
}

export function kendamaString(ball: Vector3, heading: Vector3, swing: number): Vector3[] {
  const a = knot(ball);
  const rest = slack(a, ball);
  if (swing <= 0) return rest;
  const moving = swinging(a, ball, heading);
  if (swing >= 1) return moving;
  return rest.map((p, k) => p.lerp(moving[k], swing));
}
