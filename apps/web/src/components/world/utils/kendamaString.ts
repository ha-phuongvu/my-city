import { Vector3 } from "three";
import { CLEAR, CROSS, KNOT_DROP, LENGTH, POINTS, WOOD } from "../constants/kendamaString.constants";

// The kendama's string, worked out as the prototype's mKendama does, in the toy's own frame (x across,
// y forward, so behind the toy's plane is -y, z up). It is tied on the cross-piece, 0.19 out from its
// middle: on the front just under the spike, or on the back facing the ball while the ball is behind.
// At rest on the spike it's slack and bows out in front. Swinging, it trails behind the ball in a curve
// and sags a little, bending in front of the toy, or behind it with the ball; the curve takes up just
// the string that isn't pulled straight, so the string keeps its length. Either way it keeps clear of the
// wood all along, leaving it at a good slant.

/** How far a point is from the wood (less than 0 inside it) */
function gap(p: Vector3): number {
  let best = Infinity;
  for (const [axis, a0, r0, a1, r1] of WOOD) {
    const a = axis === "z" ? p.z : p.x;
    const r = axis === "z" ? Math.hypot(p.x, p.y) : Math.hypot(p.y, p.z - CROSS.z);
    const c = Math.min(a1, Math.max(a0, a));
    const R = r0 + ((r1 - r0) * (c - a0)) / (a1 - a0);
    best = Math.min(best, a === c ? r - R : Math.hypot(a - c, Math.max(0, r - R)));
  }
  return best;
}

/** How far round to the back the string has gone: 0 with the ball in front, 1 once it's 0.25 behind */
function behind(ball: Vector3): number {
  const k = Math.min(1, Math.max(0, -ball.y / 0.25));
  return k * k * (3 - 2 * k);
}

/**
 * Where the string is tied for a ball at `ball`. It moves round to the back smoothly, never jumps,
 * and never lower on the back than a little under the middle, and over the top of the cross-piece it slides along it toward the ball's side, so it goes round the
 * spike rather than through it.
 */
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

/** At rest: a gentle bow out in front, by however much string is slack while the ball sits on the spike */
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

/** A smooth bend toward `dir`, h deep, a little deeper toward the ball */
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

/** The bend toward `dir` as deep as the string's length allows */
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

/**
 * How clear of the wood the string is: the least, over each point along it and each halfway between,
 * of how much further from the wood it is than it has to be there (CLEAR); under 0 if it's too near
 */
function clearance(pts: Vector3[]): number {
  let along = 0;
  let least = Infinity;
  const half = new Vector3();
  for (let k = 1; k < pts.length; k++) {
    const l = pts[k].distanceTo(pts[k - 1]);
    half.copy(pts[k]).add(pts[k - 1]).multiplyScalar(0.5);
    for (const [p, s] of [
      [half, along + l / 2],
      [pts[k], along + l],
    ] as const)
      if (s > CLEAR.from)
        least = Math.min(least, gap(p) - Math.min(CLEAR.most, CLEAR.near + CLEAR.ramp * (s - CLEAR.from)));
    along += l;
  }
  return least;
}

/** Swinging: trailing behind the ball (`heading` is which way it's going) and turned off the wood */
function swinging(a: Vector3, ball: Vector3, heading: Vector3): Vector3[] {
  const cu = ball.clone().sub(a).normalize();
  // which way it bends: back from where the ball is going, down a little, and away from the wood,
  // square to the line from knot to ball
  const w = heading
    .clone()
    .normalize()
    .negate()
    .add(new Vector3(0, 0.5 - behind(ball), -0.45));
  w.addScaledVector(cu, -w.dot(cu));
  if (w.lengthSq() > 1e-12) w.normalize();
  else w.set(0, ball.y < 0 ? -1 : 1, 0);
  // if that bend would come too near the wood, it turns round the line from knot to ball, a little at a
  // time either way, until the string is clear of it all along; if no way round is, the one that comes nearest
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

/**
 * Points along the string from its knot to the ball at `ball`, in the toy's own frame. `heading` is
 * which way the ball is going and `swing` how far into the swing it is (0 at rest, 1 swinging), so
 * the string eases from its resting bow into the trailing curve as the ball leaves the spike and back
 * as it lands.
 */
export function kendamaString(ball: Vector3, heading: Vector3, swing: number): Vector3[] {
  const a = knot(ball);
  const rest = slack(a, ball);
  if (swing <= 0) return rest;
  const moving = swinging(a, ball, heading);
  if (swing >= 1) return moving;
  return rest.map((p, k) => p.lerp(moving[k], swing));
}
