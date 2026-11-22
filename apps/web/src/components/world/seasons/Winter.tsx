"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Matrix4,
  type Mesh,
  MeshStandardMaterial,
  type PerspectiveCamera,
  Points,
  Quaternion,
  ShaderMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { CITIES } from "../constants/layout.constants";
import { OPEN, PIECES, RADIUS } from "../constants/cities/plaza/PlazaWall.constants";
import { GROUND_Y } from "../constants/wave.constants";
import { FOV } from "../constants/core/WorldCanvas.constants";
import { SRC as PROPS } from "../constants/cities/WorldProps.constants";
import {
  LIGHTS,
  PRESENTS,
  SNOWFALL,
  SNOWMAN,
  SNOWMEN,
  TIER,
  TREE,
  FACE,
  UP,
  WALL_HIGHEST,
  WALL_OFF,
  WALL_SPAN,
  WALL_REACH,
} from "../constants/seasons/Winter.constants";
import { G as BRICK_GROUND } from "../constants/brickRing.constants";
import { brickRing, stretchesFrom } from "../utils/brickRing";
import { rng } from "../utils/foliageMesh";
import { useStill } from "../utils/pointing";
import { useRoomLight, withRoomLight } from "../utils/roomLight";
import { isWinter } from "../utils/season";
import { useParts } from "../utils/useParts";
import { ownWave, WAVE_GLSL, WAVE_UNIFORMS } from "../utils/wave";

// Christmas in the winter world, over everything else, as on the winter prototype (its christmas3D):
// - snow falling round wherever the camera looks, drifting with the wind and swaying as it comes down
//   (each flake stays where it is in the world as the camera moves over it; the box it falls in grows
//   and shrinks with how far back the camera is, in steps);
// - a big fir in the World Plaza beside the fountain, on the side away from the lanes: tiers of winter
//   green with snow along their tops, a gold garland wound round it, baubles hanging from its branch
//   tips, fairy lights, a glowing gold star on top, and presents in the snow under it;
// - warm fairy lights strung along the top of every city's wall and the plaza's, drooping a little
//   between their hooks, wherever the wall stands (none across the ways in);
// - three snowmen out in the snow by the lanes, facing the opening view: coal eyes, smile and buttons,
//   a carrot nose, a scarf, twig arms and a hat each.
// The tree, the presents and the snowmen are lit like the world's models and come up with the
// opening's wave; the lights shine once the wave has passed them. With less motion no snow falls and
// nothing twinkles. Nothing of it is there in summer.

const G = GROUND_Y;
const at = (x: number, y: number, z: number) => new Matrix4().makeTranslation(x, y, z);

/** Pieces gathered into one mesh, every corner its colour */
class Pieces {
  position: number[] = [];
  normal: number[] = [];
  color: number[] = [];
  index: number[] = [];
  private c = new Color();
  private n = new Vector3();
  private p = new Vector3();

  /** A piece moved by m, each corner coloured c (a colour, or one from its normal and point) */
  put(g: BufferGeometry, c: string | ((n: Vector3, p: Vector3) => string), m?: Matrix4) {
    if (m) g.applyMatrix4(m);
    if (!g.attributes.normal) g.computeVertexNormals();
    const P = g.attributes.position;
    const N = g.attributes.normal;
    const base = this.position.length / 3;
    for (let i = 0; i < P.count; i++) {
      this.p.fromBufferAttribute(P, i);
      this.n.fromBufferAttribute(N, i).normalize();
      this.c.set(typeof c === "function" ? c(this.n, this.p) : c);
      this.position.push(this.p.x, this.p.y, this.p.z);
      this.normal.push(this.n.x, this.n.y, this.n.z);
      this.color.push(this.c.r, this.c.g, this.c.b);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) this.index.push(base + g.index.getX(i));
    else for (let i = 0; i < P.count; i++) this.index.push(base + i);
    g.dispose();
  }

  geometry() {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.position, 3));
    g.setAttribute("normal", new Float32BufferAttribute(this.normal, 3));
    g.setAttribute("color", new Float32BufferAttribute(this.color, 3));
    g.setIndex(this.index);
    g.computeBoundingSphere();
    return g;
  }
}

/** Glowing points (the bulbs and the star's glow): where, colour, and [size, phase, how fast it twinkles] */
class Glows {
  position: number[] = [];
  tint: number[] = [];
  glow: number[] = [];
  private c = new Color();
  constructor(private still: boolean) {}

  add(x: number, y: number, z: number, c: string, size: number, speed: number) {
    this.c.set(c);
    this.position.push(x, y, z);
    this.tint.push(this.c.r, this.c.g, this.c.b);
    this.glow.push(size, Math.random() * Math.PI * 2, this.still ? 0 : speed);
  }
}

const mix = (a: string, b: string, t: number) =>
  `#${new Color(a).lerp(new Color(b), t).getHexString()}`;
const warm = () => LIGHTS.colors[Math.floor(Math.random() * LIGHTS.colors.length)];
const twinkle = () =>
  (Math.PI * 2) / (LIGHTS.twinkle[0] + Math.random() * (LIGHTS.twinkle[1] - LIGHTS.twinkle[0]));

/** The plaza's tree, its presents, and the lights on it */
function christmasTree(pieces: Pieces, glows: Glows) {
  const T = TREE;
  const [tx, tz] = T.at;
  const yb = G + T.foot;
  // each tier: its foot, height and width; the stack is then fitted to the tree's height
  const tiers: { y: number; h: number; r: number }[] = [];
  let [y, hb, rb] = [yb + 0.55, 1, T.radius as number];
  for (let i = 0; i < T.tiers; i++) {
    tiers.push({ y, h: hb, r: rb });
    y += hb * T.over;
    hb *= T.shrink[0];
    rb *= T.shrink[1];
  }
  const last = tiers[T.tiers - 1];
  const fit = (T.height - 0.45 - 0.55) / (last.y + last.h - yb - 0.55);
  for (const t of tiers) {
    t.y = yb + 0.55 + (t.y - yb - 0.55) * fit;
    t.h *= fit;
  }
  const top = last.y + last.h;
  // how far out the tree reaches at height Y (its tiers' outsides)
  const outAt = (Y: number) => {
    let r = 0.12;
    for (const t of tiers) {
      const f = (Y - t.y) / t.h;
      if (f >= -0.02 && f <= 1) r = Math.max(r, t.r * Math.min(1, 1 - f * 0.95));
    }
    return r;
  };
  pieces.put(new CylinderGeometry(0.2, 0.26, 0.75, 10), T.trunk, at(tx, yb + 0.375, tz));
  tiers.forEach((t, k) => {
    // a tier: a cone with its rim drooping into branch tips, curling under, and its underside back to the trunk
    const g = new LatheGeometry(
      TIER.map(([out, up]) => new Vector2(out * t.r, up * t.h)),
      28,
    );
    const P = g.attributes.position;
    for (let v = 0; v < P.count; v++) {
      const [x, z] = [P.getX(v), P.getZ(v)];
      const out = Math.max(0, Math.hypot(x, z) / t.r - 0.6) / 0.4;
      const tip = Math.sin(Math.atan2(z, x) * 9 + k * 1.7);
      P.setXYZ(
        v,
        x * (1 + 0.07 * out * tip),
        P.getY(v) - 0.06 * t.h * out * (1 + tip) * 0.5,
        z * (1 + 0.07 * out * tip),
      );
    }
    g.computeVertexNormals();
    // (its top facing up: the lathe may have turned its faces inside out)
    const N = g.attributes.normal;
    if (N.getY(2) < 0) for (let v = 0; v < N.array.length; v++) N.array[v] = -N.array[v];
    // snow in drifts along the top of the tier toward its tips, here and there round it; the tips,
    // the rest and the underside green
    pieces.put(
      g,
      (n, p) => {
        const [lx, lz] = [p.x - tx, p.z - tz];
        const [r, a] = [Math.hypot(lx, lz) / t.r, Math.atan2(lz, lx)];
        const green = T.green[(k + (Math.sin(a * 5 + k) > 0.6 ? 1 : 0)) % 2];
        const lo = 0.7 + 0.1 * Math.sin(a * 7 + k * 2.3) + 0.05 * Math.sin(a * 13 + k);
        if (n.y < 0.15) return T.green[2];
        if (r > lo && r < 0.9 && Math.sin(a * 4 + k * 1.9) > -0.45) return T.snow;
        return r >= 0.9 ? mix(green, T.snow, 0.12) : green;
      },
      at(tx, t.y, tz),
    );
  });
  // the garland, wound round from just under the star to the bottom tier
  const [g0, g1] = [tiers[0].y + 0.1, top - 0.35];
  const path: Vector3[] = [];
  for (let i = 0; i <= 120; i++) {
    const u = i / 120;
    const Y = g1 + (g0 - g1) * u;
    const a = u * T.garland.turns * Math.PI * 2;
    const R = outAt(Y) * 0.93 + 0.05;
    path.push(
      new Vector3(tx + R * Math.cos(a), Y - 0.08 * Math.abs(Math.sin(a * 2)), tz + R * Math.sin(a)),
    );
  }
  pieces.put(
    new TubeGeometry(new CatmullRomCurve3(path), 240, T.garland.thick, 6, false),
    T.garland.color,
  );
  // the baubles, hanging from each tier's tips
  let seed = 1225;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  let bi = 0;
  tiers.forEach((t, k) => {
    const count = T.baubles.count[k];
    for (let j = 0; j < count; j++) {
      const a = ((j + rnd() * 0.6) / count) * Math.PI * 2 + k * 0.7;
      const r = t.r * 0.9;
      const s = Math.max(0.085, T.baubles.size * t.r * (0.85 + rnd() * 0.3));
      const c = T.baubles.colors[bi++ % T.baubles.colors.length];
      const [x, z] = [tx + r * Math.cos(a), tz + r * Math.sin(a)];
      pieces.put(new SphereGeometry(s, 12, 9), c, at(x, t.y - 0.02 - s * 0.6, z));
      pieces.put(
        new CylinderGeometry(s * 0.3, s * 0.3, s * 0.3, 8),
        T.baubles.cap,
        at(x, t.y - 0.02 + s * 0.45, z),
      );
    }
  });
  // the star on top, its face to the opening view, and its glow
  const star = new Shape();
  const { outer, inner } = T.star;
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? inner : outer;
    if (i) star.lineTo(r * Math.cos(a), r * Math.sin(a));
    else star.moveTo(r * Math.cos(a), r * Math.sin(a));
  }
  const sg = new ExtrudeGeometry(star, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  sg.translate(0, 0, -0.05);
  pieces.put(
    sg,
    (n) => mix(T.star.color, T.star.shine, Math.max(0, n.y) * 0.3),
    at(tx, top + outer * 0.75, tz).multiply(new Matrix4().makeRotationY(Math.PI / 4)),
  );
  glows.add(tx, top + outer * 0.75, tz, T.star.light, T.star.glow, T.star.twinkle);
  // the fairy lights on it, wound the other way
  for (let i = 0; i < T.lights.count; i++) {
    const u = (i + 0.5) / T.lights.count;
    const Y = g1 - 0.15 + (g0 - g1 + 0.15) * u;
    const a = -u * T.lights.turns * Math.PI * 2 + 1.3;
    const R = outAt(Y) * 0.92 + 0.07;
    glows.add(tx + R * Math.cos(a), Y, tz + R * Math.sin(a), warm(), LIGHTS.size * 0.8, twinkle());
  }
  // a drift of snow round its foot, and the presents in it
  const drift = new SphereGeometry(1.55, 28, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  drift.scale(1, 0.1, 1);
  pieces.put(drift, SNOWMAN.snow, at(tx, yb - 0.01, tz));
  PRESENTS.forEach(([turn, out, w, d, h, box, ribbon], j) => {
    const a = ((turn + 45) * Math.PI) / 180;
    const M = at(tx + out * Math.cos(a), yb + h / 2 + 0.03, tz + out * Math.sin(a)).multiply(
      new Matrix4().makeRotationY(a + 0.4 * Math.sin(j * 3.1)),
    );
    pieces.put(
      new BoxGeometry(w, h, d),
      (n) => (n.y > 0.7 ? mix(box, SNOWMAN.snow, 0.25) : box),
      M.clone(),
    );
    pieces.put(new BoxGeometry(w + 0.012, h + 0.012, 0.075), ribbon, M.clone());
    pieces.put(new BoxGeometry(0.075, h + 0.012, d + 0.012), ribbon, M.clone());
    // the bow: two loops and a knot
    for (const side of [-1, 1])
      pieces.put(
        new TorusGeometry(0.075, 0.025, 6, 12),
        ribbon,
        M.clone()
          .multiply(at(side * 0.07, h / 2 + 0.06, 0))
          .multiply(new Matrix4().makeRotationZ(side * 0.6)),
      );
    pieces.put(new SphereGeometry(0.035, 8, 6), ribbon, M.clone().multiply(at(0, h / 2 + 0.03, 0)));
  });
}

/** A snowman at (x, z), turned from facing the opening view, s big, with its hat and scarf */
function snowman(pieces: Pieces, [x, z, turn, s, hat, scarf]: (typeof SNOWMEN)[number]) {
  const SM = SNOWMAN;
  const d = FACE.clone().applyAxisAngle(UP, (turn * Math.PI) / 180);
  const side = new Vector3(d.z, 0, -d.x);
  const ball = (r: number, Y: number, squash = 1) => {
    const g = new SphereGeometry(r * s, 22, 16);
    g.scale(1, squash, 1);
    pieces.put(g, SM.snow, at(x, G + Y * s, z));
  };
  // a spot on the ball of radius r at height Y: so far up and across from its front
  const on = (Y: number, r: number, up: number, across: number) =>
    new Vector3(x, G + Y * s, z)
      .addScaledVector(d, r * s * Math.cos(up) * Math.cos(across))
      .addScaledVector(side, r * s * Math.sin(across) * Math.cos(up))
      .add(new Vector3(0, r * s * Math.sin(up), 0));
  const coal = (c: Vector3, r: number) =>
    pieces.put(new SphereGeometry(r * s, 8, 6), SM.coal, at(c.x, c.y, c.z));
  // its shadow, a soft blue patch on the snow
  const shadow = new CircleGeometry(0.7 * s, 24);
  shadow.rotateX(-Math.PI / 2);
  pieces.put(shadow, SM.shadow, at(x + 0.1 * s, G + 0.012, z - 0.06 * s));
  ball(0.56, 0.47, 0.92);
  ball(0.41, 1.12);
  ball(0.3, 1.63);
  // coal buttons, eyes and a smile
  for (const u of [-0.15, 0.05, 0.25]) coal(on(1.12, 0.41, u / 0.41, 0), 0.045);
  for (const u of [-0.32, 0.32]) coal(on(1.63, 0.3, 0.28, u), 0.035);
  for (let m = 0; m < 5; m++)
    coal(on(1.63, 0.3, -0.25 - 0.08 * Math.sin((m / 4) * Math.PI), -0.36 + m * 0.18), 0.022);
  // the carrot nose
  const nose = new ConeGeometry(0.055 * s, 0.32 * s, 10);
  nose.rotateX(Math.PI / 2);
  const tip = on(1.63, 0.3, 0.04, 0);
  pieces.put(
    nose,
    SM.carrot,
    at(tip.x, tip.y, tip.z)
      .multiply(new Matrix4().lookAt(new Vector3(), d.clone().negate(), UP))
      .multiply(at(0, 0, 0.14 * s)),
  );
  // the scarf round its neck, and its end hanging down the front
  const wrap = new TorusGeometry(0.27 * s, 0.07 * s, 8, 24);
  wrap.rotateX(Math.PI / 2);
  pieces.put(wrap, scarf, at(x, G + 1.4 * s, z));
  const end = on(1.32, 0.42, 0, 0.5);
  pieces.put(
    new BoxGeometry(0.13 * s, 0.4 * s, 0.05 * s),
    scarf,
    at(end.x, end.y - 0.12 * s, end.z)
      .multiply(new Matrix4().makeRotationY(Math.atan2(d.x, d.z) + 0.5))
      .multiply(new Matrix4().makeRotationZ(0.15)),
  );
  // twig arms, up and out to either side
  for (const sd of [-1, 1]) {
    const from = new Vector3(x, G + 1.18 * s, z).addScaledVector(side, sd * 0.36 * s);
    const dir = side
      .clone()
      .multiplyScalar(sd)
      .add(new Vector3(0, 0.55, 0))
      .normalize();
    const len = 0.62 * s;
    const arm = new CylinderGeometry(0.018 * s, 0.028 * s, len, 6);
    arm.translate(0, len / 2, 0);
    pieces.put(
      arm,
      SM.twig,
      at(from.x, from.y, from.z).multiply(
        new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(UP, dir)),
      ),
    );
    const fork = new CylinderGeometry(0.012 * s, 0.016 * s, 0.2 * s, 5);
    fork.translate(0, 0.1 * s, 0);
    const mid = from.clone().addScaledVector(dir, len * 0.7);
    const forkDir = dir
      .clone()
      .add(new Vector3(0, 0.9, 0))
      .normalize();
    pieces.put(
      fork,
      SM.twig,
      at(mid.x, mid.y, mid.z).multiply(
        new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(UP, forkDir)),
      ),
    );
  }
  // its hat
  const hy = G + 1.84 * s;
  if (hat === 0) {
    pieces.put(new CylinderGeometry(0.3 * s, 0.3 * s, 0.035 * s, 20), SM.hat, at(x, hy, z));
    pieces.put(
      new CylinderGeometry(0.19 * s, 0.2 * s, 0.34 * s, 20),
      SM.hat,
      at(x, hy + 0.17 * s, z),
    );
    pieces.put(
      new CylinderGeometry(0.205 * s, 0.205 * s, 0.06 * s, 20),
      SM.band,
      at(x, hy + 0.05 * s, z),
    );
  } else {
    const cap = new SphereGeometry(0.29 * s, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    cap.scale(1, 1.15, 1);
    pieces.put(cap, SM.knit[hat - 1], at(x, hy - 0.11 * s, z));
    pieces.put(
      new TorusGeometry(0.28 * s, 0.045 * s, 6, 20).rotateX(Math.PI / 2),
      SM.bobble,
      at(x, hy - 0.09 * s, z),
    );
    pieces.put(new SphereGeometry(0.085 * s, 10, 8), SM.bobble, at(x, hy + 0.25 * s, z));
  }
}

/**
 * Bulbs along the top of a ring of wall round (cx, cz), r out, wherever its bricks stand (`bricks`:
 * each brick's corners, x, height and z): each stretch evenly strung, drooping between hooks, from
 * its top
 */
function wallLights(glows: Glows, cx: number, cz: number, r: number, bricks: Brick[][]) {
  const L = LIGHTS;
  const bins = new Uint8Array(360);
  let top = G;
  for (const brick of bricks) {
    // (the degrees round the ring it spans, from its first corner's)
    if (brick.some(([x, , z]) => Math.abs(Math.hypot(x - cx, z - cz) - r) > WALL_OFF)) continue;
    const ref = Math.atan2(brick[0][2] - cz, brick[0][0] - cx);
    let [a0, a1] = [Infinity, -Infinity];
    for (const [x, y, z] of brick) {
      let a = Math.atan2(z - cz, x - cx) - ref;
      a -= Math.round(a / (Math.PI * 2)) * Math.PI * 2;
      [a0, a1] = [Math.min(a0, a), Math.max(a1, a)];
      top = Math.max(top, y);
    }
    if (a1 - a0 > WALL_SPAN) continue;
    for (
      let b = Math.floor(((ref + a0) * 180) / Math.PI);
      b <= Math.ceil(((ref + a1) * 180) / Math.PI);
      b++
    )
      bins[((b % 360) + 360) % 360] = 1;
  }
  let start = 0;
  while (start < 360 && bins[start]) start++;
  if (start === 360) start = 0;
  let run: number[] = [];
  for (let k = 0; k <= 360; k++) {
    // (each bin by how far it is round from start, so a stretch over the 0° line stays in one piece)
    if (k < 360 && bins[(start + k) % 360]) {
      run.push(start + k);
      continue;
    }
    if (run.length * (Math.PI / 180) * r > L.shortest) {
      const a0 = (run[0] * Math.PI) / 180;
      const a1 = ((run[run.length - 1] + 1) * Math.PI) / 180;
      const n = Math.max(2, Math.round(((a1 - a0) * r) / L.spacing));
      for (let j = 0; j <= n; j++) {
        const a = a0 + ((a1 - a0) * j) / n;
        const sag = Math.sin(((j % L.hook) / L.hook) * Math.PI);
        const R = r + 0.12 + 0.08 * sag;
        glows.add(
          cx + R * Math.cos(a),
          top + 0.04 - L.droop * sag,
          cz + R * Math.sin(a),
          warm(),
          L.size,
          twinkle(),
        );
      }
    }
    run = [];
  }
}

type Brick = [x: number, y: number, z: number];

/** The plaza wall's bricks (as PlazaWall.tsx builds it, in the site's units) */
function plazaBricks(): Brick[][] {
  return brickRing(0, 0, RADIUS, "#000000", 4242, stretchesFrom(PIECES, OPEN)).flatMap(
    ({ corners }) => {
      const zs = corners.map((p) => p[2]);
      // (the wall's own bricks, not the taller gateposts)
      if (Math.max(...zs) - Math.min(...zs) > WALL_HIGHEST) return [];
      return [corners.map((p): Brick => [p[0], p[2] - BRICK_GROUND, p[1]])];
    },
  );
}

/** A city wall's ring: the middle of its bricks' distances from the city's middle */
function ringOf(cx: number, cz: number, bricks: Brick[][]) {
  const d = bricks
    .flat()
    .map(([x, , z]) => Math.hypot(x - cx, z - cz))
    .filter((v) => v > WALL_REACH[0] && v < WALL_REACH[1])
    .sort((a, b) => a - b);
  return d.length ? d[Math.floor(d.length / 2)] : 0;
}

const GLOW_VERTEX = /* glsl */ `
  attribute vec3 tint;
  attribute vec3 glow;
  uniform float uTime;
  uniform float uScale;
  uniform float uLeast;
  ${WAVE_GLSL}
  varying vec3 vTint;
  varying float vLit;
  void main() {
    vec3 p = position;
    float rise = waveRise(p.xz);
    p.y = waveG + (p.y - waveG) * rise;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vLit = glow.z > 0.0 ? 0.62 + 0.38 * sin(uTime * glow.z + glow.y) : 1.0;
    vTint = tint;
    gl_PointSize = max(glow.x * uScale / -mv.z, uLeast) * (0.8 + 0.3 * vLit) * step(0.5, rise);
  }
`;
// a coloured bulb, brighter in the middle as it twinkles, and its glow round it
const GLOW_FRAGMENT = /* glsl */ `
  varying vec3 vTint;
  varying float vLit;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float bulb = 1.0 - smoothstep(0.42, 0.55, d), hot = 1.0 - smoothstep(0.0, 0.3, d), halo = (1.0 - d) * (1.0 - d);
    vec3 c = mix(vTint * (0.75 + 0.35 * vLit), vec3(1.0, 0.98, 0.9), hot * 0.7 * vLit);
    gl_FragColor = vec4(c, max(bulb, halo * 0.45 * vLit));
    #include <colorspace_fragment>
  }
`;

const S = SNOWFALL;
const SNOW_VERTEX = /* glsl */ `
  attribute vec4 seed;
  uniform float uTime;
  uniform vec3 uCenter;
  uniform float uBox;
  uniform float uScale;
  uniform float uDpr;
  uniform vec2 uFog;
  varying float vAlpha;
  void main() {
    float B = uBox, H = uBox * ${S.high.toFixed(3)}, fall = mix(${S.fall[0].toFixed(1)}, ${S.fall[1].toFixed(1)}, seed.w);
    // each flake on a grid of boxes laid over the world, drifting and falling; the box round the spot
    // the camera looks at shows it
    vec2 wind = vec2(0.70710678, -0.70710678) * ${S.drift[0].toFixed(4)} + vec2(0.70710678, 0.70710678) * ${S.drift[1].toFixed(4)};
    vec2 w = seed.xz * B + wind * B * uTime
      + vec2(sin(uTime * (0.5 + seed.w) + seed.x * 40.0), cos(uTime * (0.4 + seed.y) + seed.z * 30.0)) * B * ${S.sway.toFixed(4)};
    vec2 local = mod(w - (uCenter.xz - 0.5 * B), B);
    float h = mod(seed.y * H - uTime * H / fall, H);
    vec3 p = vec3(uCenter.x - 0.5 * B + local.x, uCenter.y + h, uCenter.z - 0.5 * B + local.y);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float px = ${S.size.toFixed(5)} * B * uScale / -mv.z;
    gl_PointSize = clamp(px, ${S.pixels[0].toFixed(2)} * uDpr, ${S.pixels[1].toFixed(2)} * uDpr);
    vec2 e = abs(local / B - 0.5) * 2.0;
    vAlpha = 0.9 * min(1.0, px / (${S.pixels[0].toFixed(2)} * uDpr)) * (1.0 - smoothstep(0.8, 1.0, max(e.x, e.y)))
      * smoothstep(0.0, 0.06, h / H) * (1.0 - smoothstep(0.9, 1.0, h / H))
      * (1.0 - 0.75 * smoothstep(uFog.x, uFog.y, -mv.z));
  }
`;
const SNOW_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uShow;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0 || uShow < 0.01) discard;
    gl_FragColor = vec4(uColor, uShow * vAlpha * (1.0 - smoothstep(0.35, 1.0, d)));
    #include <colorspace_fragment>
  }
`;

/** Christmas in the world: only in winter */
export function Winter() {
  return isWinter() ? <Christmas /> : null;
}

function Christmas() {
  const still = useStill();
  const light = useRoomLight();
  const { partsNamed } = useParts(PROPS);
  const gl = useThree((state) => state.gl);

  const { decor, glows, look } = useMemo(() => {
    const pieces = new Pieces();
    const lights = new Glows(still);
    christmasTree(pieces, lights);
    for (const q of SNOWMEN) snowman(pieces, q);
    // the walls' fairy lights: the plaza's, and each city's (its bricks in world-props.glb's walls)
    wallLights(lights, 0, 0, RADIUS, plazaBricks());
    // (each of the walls' triangles as a brick)
    const bricks: Brick[][] = [];
    const p = new Vector3();
    for (const part of partsNamed("walls")) {
      part.updateWorldMatrix(true, true);
      part.traverse((object) => {
        const geometry = (object as Mesh).geometry;
        const position = geometry?.getAttribute("position");
        if (!position) return;
        const corner = (i: number): Brick => {
          p.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
          return [p.x, p.y, p.z];
        };
        const index = geometry.index;
        const count = index ? index.count : position.count;
        for (let i = 0; i + 2 < count; i += 3)
          bricks.push([0, 1, 2].map((k) => corner(index ? index.getX(i + k) : i + k)));
      });
    }
    for (const { center } of CITIES) {
      const r = ringOf(center[0], center[1], bricks);
      if (r) wallLights(lights, center[0], center[1], r, bricks);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(lights.position, 3));
    g.setAttribute("tint", new Float32BufferAttribute(lights.tint, 3));
    g.setAttribute("glow", new Float32BufferAttribute(lights.glow, 3));
    const points = new Points(
      g,
      ownWave(
        new ShaderMaterial({
          uniforms: {
            ...WAVE_UNIFORMS,
            uTime: { value: 0 },
            uScale: { value: 1 },
            uLeast: { value: LIGHTS.least },
          },
          vertexShader: GLOW_VERTEX,
          fragmentShader: GLOW_FRAGMENT,
          transparent: true,
          depthWrite: false,
        }),
      ),
    );
    points.frustumCulled = false;
    const material = withRoomLight(
      new MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }),
      light,
    );
    return { decor: pieces.geometry(), glows: points, look: material };
  }, [still, light, partsNamed]);

  const flakes = useMemo(() => {
    if (still) return null;
    // (seeded, so the flakes fall the same way every visit)
    const random = rng(S.seed);
    const seed = new Float32Array(S.count * 4).map(() => random());
    const g = new BufferGeometry();
    // (three.js wants a position; where a flake is comes from its seed)
    g.setAttribute("position", new Float32BufferAttribute(new Float32Array(S.count * 3), 3));
    g.setAttribute("seed", new Float32BufferAttribute(seed, 4));
    const points = new Points(
      g,
      ownWave(
        new ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
            uCenter: { value: new Vector3() },
            uBox: { value: 100 },
            uScale: { value: 1 },
            uDpr: { value: 1 },
            uFog: { value: new Vector2(90, 330) },
            uColor: { value: new Color(S.color) },
            uShow: { value: 0 },
          },
          vertexShader: SNOW_VERTEX,
          fragmentShader: SNOW_FRAGMENT,
          transparent: true,
          depthWrite: false,
        }),
      ),
    );
    points.frustumCulled = false;
    points.renderOrder = 3;
    return points;
  }, [still]);

  useEffect(
    () => () => {
      decor.dispose();
      glows.geometry.dispose();
      (glows.material as ShaderMaterial).dispose();
      look.dispose();
      flakes?.geometry.dispose();
      (flakes?.material as ShaderMaterial | undefined)?.dispose();
    },
    [decor, glows, look, flakes],
  );

  // each frame: the time, how big a map unit is on screen, and the snow's box round the spot the camera looks at
  const glowing = useRef<Points>(null);
  const falling = useRef<Points>(null);
  const toward = useRef(new Vector3());
  const aimed = useRef(new Vector3());
  useFrame(({ clock, camera, scene }, delta) => {
    const t = clock.elapsedTime;
    const scale =
      gl.domElement.height /
      2 /
      Math.tan(((((camera as PerspectiveCamera).fov ?? FOV) / 2) * Math.PI) / 180);
    if (!glowing.current) return;
    const gu = (glowing.current.material as ShaderMaterial).uniforms;
    gu.uTime.value = t;
    gu.uScale.value = scale;
    gu.uLeast.value = LIGHTS.least * gl.getPixelRatio();
    if (!falling.current) return;
    const fu = (falling.current.material as ShaderMaterial).uniforms;
    const look3 = camera.getWorldDirection(toward.current);
    const aim = aimed.current;
    const d = look3.y < -0.02 ? (G - camera.position.y) / look3.y : 60;
    aim.copy(camera.position).addScaledVector(look3, d);
    const box = S.step ** Math.round(Math.log(Math.max(12, d * S.box)) / Math.log(S.step));
    fu.uTime.value = t;
    fu.uScale.value = scale;
    fu.uDpr.value = gl.getPixelRatio();
    fu.uBox.value = box;
    fu.uCenter.value.set(aim.x, G, aim.z);
    // (none while the opening waits on its paper; it comes in as the opening's wave sets off)
    const show = WAVE_UNIFORMS.waveR.value > 0 ? 1 : 0;
    fu.uShow.value += (show - fu.uShow.value) * Math.min(1, (delta * 1000) / S.comeIn);
    const fog = scene.fog as { near: number; far: number } | null;
    if (fog) fu.uFog.value.set(fog.near, fog.far);
  });

  return (
    <group userData={{ noSnow: true }}>
      <mesh geometry={decor} material={look} castShadow receiveShadow />
      <primitive ref={glowing} object={glows} />
      {flakes && <primitive ref={falling} object={flakes} />}
    </group>
  );
}
