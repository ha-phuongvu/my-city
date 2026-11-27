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
  NO_CHASE,
  STOCKINGS,
  TIPS,
  TREE,
  TREE_LIGHTS,
  FACE,
  UP,
  WALL_HIGHEST,
  WALL_OFF,
  WALL_SPAN,
  WALL_REACH,
} from "../constants/seasons/Winter.constants";
import { G as BRICK_GROUND } from "../constants/brickRing.constants";
import { brickRing, stretchesFrom } from "../utils/brickRing";
import { rng } from "../utils/random";
import { useStill } from "../utils/pointing";
import { useRoomLight, withRoomLight } from "../utils/roomLight";
import { isWinter } from "../utils/season";
import { useParts } from "../utils/useParts";
import { ownWave, WAVE_GLSL, WAVE_UNIFORMS } from "../utils/wave";
import { smoothstep } from "../utils/curves";

const G = GROUND_Y;
const at = (x: number, y: number, z: number) => new Matrix4().makeTranslation(x, y, z);

class Pieces {
  position: number[] = [];
  normal: number[] = [];
  color: number[] = [];
  index: number[] = [];
  private c = new Color();
  private n = new Vector3();
  private p = new Vector3();

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

class Glows {
  position: number[] = [];
  tint: number[] = [];
  glow: number[] = [];
  chase: number[] = [];
  private c = new Color();
  constructor(private still: boolean) {}

  add(
    x: number,
    y: number,
    z: number,
    c: string,
    size: number,
    speed: number,
    haze = false,
    chase = NO_CHASE,
  ) {
    this.c.set(c);
    this.position.push(x, y, z);
    this.tint.push(this.c.r, this.c.g, this.c.b);
    this.glow.push(size, Math.random() * Math.PI * 2, this.still ? 0 : speed, haze ? 0 : 1);
    this.chase.push(this.still ? NO_CHASE : chase);
  }
}

const mix = (a: string, b: string, t: number) =>
  `#${new Color(a).lerp(new Color(b), t).getHexString()}`;
const warm = () => LIGHTS.colors[Math.floor(Math.random() * LIGHTS.colors.length)];
const twinkle = () =>
  (Math.PI * 2) / (LIGHTS.twinkle[0] + Math.random() * (LIGHTS.twinkle[1] - LIGHTS.twinkle[0]));

type Tier = { y: number; h: number; r: number; n: number; turn: number };

function sheet(P: number[], rows: number, cols: number) {
  const g = new BufferGeometry();
  const I: number[] = [];
  for (let r = 0; r + 1 < rows; r++)
    for (let c = 0; c + 1 < cols; c++) {
      const v = r * cols + c;
      I.push(v, v + cols, v + 1, v + 1, v + cols, v + cols + 1);
    }
  g.setAttribute("position", new Float32BufferAttribute(P, 3));
  g.setIndex(I);
  g.computeVertexNormals();
  let up = 0;
  for (let v = 0; v < rows * cols; v++) up += g.attributes.normal.getY(v);
  if (up < 0) {
    for (let v = 0; v < I.length; v += 3) [I[v + 1], I[v + 2]] = [I[v + 2], I[v + 1]];
    g.setIndex(I);
    g.computeVertexNormals();
  }
  return g;
}

function christmasTree(pieces: Pieces, glows: Glows) {
  const T = TREE;
  const FL = TREE_LIGHTS;
  const [tx, tz] = T.at;
  const yb = G + T.foot;
  const from = pieces.position.length;
  const glowFrom = glows.position.length;

  const tiers: Tier[] = [];
  let [y, hb, rb] = [yb + T.bare, 1, T.radius as number];
  for (let i = 0; i < T.tiers; i++) {
    const n = Math.max(TIPS.least, Math.round(TIPS.count * Math.sqrt(rb / T.radius)));
    tiers.push({ y, h: hb, r: rb, n, turn: i * 0.61 });
    y += hb * T.over;
    hb *= T.shrink[0];
    rb *= T.shrink[1];
  }
  const last = tiers[T.tiers - 1];
  const fit = (T.height - 0.45 - T.bare) / (last.y + last.h - yb - T.bare);
  for (const t of tiers) {
    t.y = yb + T.bare + (t.y - yb - T.bare) * fit;
    t.h *= fit;
  }
  const top = last.y + last.h;

  const tipAt = (t: Tier, a: number) => {
    const f = (((((a - t.turn) * t.n) / (2 * Math.PI)) % 1) + 1) % 1;
    return Math.abs(2 * f - 1);
  };
  const onTier = (t: Tier, u: number, a: number, tip = tipAt(t, a)): [number, number] => {
    const s = smoothstep(TIPS.from, 1, u);
    return [
      t.r * u * (1 - TIPS.notch * s * (1 - tip)),
      t.y + t.h * (1 - u ** T.bow) - t.h * TIPS.droop * s * s * (0.35 + 0.65 * tip),
    ];
  };

  const trunk = T.bare + 0.5;
  pieces.put(
    new CylinderGeometry(0.24, 0.34, trunk, 14, 6),
    (n, p) =>
      Math.sin(Math.atan2(p.z - tz, p.x - tx) * 7 + Math.sin(p.y * 9) * 0.7) > 0.5
        ? T.trunk[1]
        : T.trunk[0],
    at(tx, yb + trunk / 2, tz),
  );

  tiers.forEach((t, k) => {
    const cols = t.n * 4 + 1;
    const rows = 15;
    const P: number[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const a = t.turn + (c / (cols - 1)) * Math.PI * 2;
        let q: [number, number];
        if (r <= 12) q = onTier(t, r / 12, a);
        else {
          const e = onTier(t, 1, a);
          const f = r === 13 ? 0.4 : 1;
          q = [e[0] * (1 - f), e[1] + (t.y + 0.28 * t.h - e[1]) * f];
        }
        P.push(tx + q[0] * Math.cos(a), q[1], tz + q[0] * Math.sin(a));
      }
    const g = sheet(P, rows, cols).toNonIndexed();
    g.computeVertexNormals();
    pieces.put(g, (n, p) => {
      if (n.y < -0.05) return T.green[3];
      const [lx, lz] = [p.x - tx, p.z - tz];
      const tip = tipAt(t, Math.atan2(lz, lx));
      const s = smoothstep(TIPS.from - 0.1, 1, Math.hypot(lx, lz) / t.r);
      return mix(T.green[1], tip > 0.5 ? T.green[0] : T.green[2], s * Math.abs(tip - 0.5) * 2);
    });

    const cap = k === T.tiers - 1;
    const SR = 9;
    const SP: number[] = [];
    const nl = Math.hypot(t.h, t.r);
    for (let r = 0; r < SR; r++)
      for (let c = 0; c < cols; c++) {
        const a = t.turn + (c / (cols - 1)) * Math.PI * 2;
        const patch = cap
          ? 1
          : smoothstep(-0.55, -0.05, Math.sin(a * 2 + k * 2.1) + 0.6 * Math.sin(a * 3 + k * 1.3));
        const wide =
          (cap ? 0.5 : 0.24 + 0.06 * Math.sin(a * 5 + k)) * patch * (0.75 + 0.3 * tipAt(t, a));
        const fr = Math.min(1, r / (SR - 2));
        const u = (cap ? 0 : 0.6) + wide * fr + (r === SR - 1 ? 0.02 * patch : 0);
        const lift =
          r === 0 || r === SR - 1
            ? 0
            : (0.05 + 0.06 * Math.sin(fr * Math.PI)) * (0.3 + 0.7 * patch);
        const q = onTier(t, u, a);
        const out = q[0] + (lift * t.h) / nl;
        SP.push(tx + out * Math.cos(a), q[1] + (lift * t.r) / nl, tz + out * Math.sin(a));
      }
    pieces.put(sheet(SP, SR, cols), T.snow);
  });

  for (const [tier, turn] of STOCKINGS.at) {
    const t = tiers[tier];
    const step = (2 * Math.PI) / t.n;
    const a = t.turn + Math.round((Math.PI / 4 - (turn * Math.PI) / 180 - t.turn) / step) * step;
    const s = turn >= 0 ? 1 : -1;
    const e = onTier(t, 0.96, a);
    const M = at(tx + (e[0] + 0.07) * Math.cos(a), e[1] - 0.02, tz + (e[0] + 0.07) * Math.sin(a))
      .multiply(new Matrix4().makeRotationY(Math.PI / 2 - a))
      .multiply(new Matrix4().makeRotationX(-0.3));
    const sock = new Shape();
    sock.moveTo(-0.08 * s, 0);
    sock.lineTo(-0.08 * s, -0.3);
    sock.quadraticCurveTo(-0.08 * s, -0.42, 0.03 * s, -0.42);
    sock.lineTo(0.15 * s, -0.42);
    sock.quadraticCurveTo(0.23 * s, -0.41, 0.22 * s, -0.34);
    sock.quadraticCurveTo(0.21 * s, -0.28, 0.08 * s, -0.26);
    sock.lineTo(0.08 * s, 0);
    sock.closePath();
    const sg = new ExtrudeGeometry(sock, {
      depth: 0.07,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    sg.translate(0, 0, -0.035);
    pieces.put(sg, STOCKINGS.color, M.clone());
    pieces.put(
      new BoxGeometry(0.24, 0.09, 0.12),
      STOCKINGS.cuff,
      M.clone().multiply(at(0, -0.02, 0)),
    );
  }

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
  glows.add(tx, top + outer * 0.75, tz, T.star.light, T.star.glow, T.star.twinkle, true);

  const reach = (Y: number) => {
    let best = 0;
    for (const t of tiers) {
      let p = onTier(t, 0, 0, 1);
      for (let j = 0; j < 40; j++) {
        const q = onTier(t, (j + 1) / 40, 0, 1);
        if ((p[1] - Y) * (q[1] - Y) <= 0 && p[1] !== q[1])
          best = Math.max(best, p[0] + ((q[0] - p[0]) * (Y - p[1])) / (q[1] - p[1]));
        p = q;
      }
    }
    return best;
  };
  const low = tiers[0].y - tiers[0].h * TIPS.droop * 0.3;
  const high = top - 0.6;
  let nb = 0;
  for (let i = 0; i < FL.strings; i++) {
    const SY = low + ((high - low) * (i + 0.35)) / FL.strings;
    const ro = reach(SY);
    const swags = Math.max(3, Math.round((2 * Math.PI * ro) / FL.swag));
    const per = Math.max(2, Math.round((2 * Math.PI * ro) / swags / FL.spacing));
    const sag = FL.sag * (0.5 + (0.5 * ro) / T.radius);
    const turn0 = i * 0.9;
    const spot = (f: number, drop: number) => {
      const a = turn0 + f * Math.PI * 2;
      const w = (f * swags) % 1;
      const Y = SY - sag * 4 * w * (1 - w) - drop;
      const R = reach(Y) + 0.05;
      return new Vector3(tx + R * Math.cos(a), Y, tz + R * Math.sin(a));
    };
    const wire: Vector3[] = [];
    for (let j = 0; j < swags * 16; j++) wire.push(spot(j / (swags * 16), 0));
    pieces.put(
      new TubeGeometry(new CatmullRomCurve3(wire, true), swags * 32, FL.thick, 5, true),
      FL.wire,
    );
    for (let j = 0; j < swags * per; j++) {
      const b = spot((j + 0.5) / (swags * per), 0.035);
      const ci = nb++ % FL.colors.length;
      glows.add(b.x, b.y, b.z, FL.colors[ci], FL.size, 0, false, ci);
    }
  }

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

  const grow = (P: number[], k: number) => {
    P[k] = tx + (P[k] - tx) * T.size;
    P[k + 1] = yb + (P[k + 1] - yb) * T.size;
    P[k + 2] = tz + (P[k + 2] - tz) * T.size;
  };
  for (let i = from; i < pieces.position.length; i += 3) grow(pieces.position, i);
  for (let i = glowFrom; i < glows.position.length; i += 3) {
    grow(glows.position, i);
    glows.glow[(i / 3) * 4] *= T.size;
  }
}

function snowman(pieces: Pieces, [x, z, turn, s, hat, scarf]: (typeof SNOWMEN)[number]) {
  const SM = SNOWMAN;
  const d = FACE.clone().applyAxisAngle(UP, (turn * Math.PI) / 180);
  const side = new Vector3(d.z, 0, -d.x);
  const ball = (r: number, Y: number, squash = 1) => {
    const g = new SphereGeometry(r * s, 22, 16);
    g.scale(1, squash, 1);
    pieces.put(g, SM.snow, at(x, G + Y * s, z));
  };

  const on = (Y: number, r: number, up: number, across: number) =>
    new Vector3(x, G + Y * s, z)
      .addScaledVector(d, r * s * Math.cos(up) * Math.cos(across))
      .addScaledVector(side, r * s * Math.sin(across) * Math.cos(up))
      .add(new Vector3(0, r * s * Math.sin(up), 0));
  const coal = (c: Vector3, r: number) =>
    pieces.put(new SphereGeometry(r * s, 8, 6), SM.coal, at(c.x, c.y, c.z));

  const shadow = new CircleGeometry(0.7 * s, 24);
  shadow.rotateX(-Math.PI / 2);
  pieces.put(shadow, SM.shadow, at(x + 0.1 * s, G + 0.012, z - 0.06 * s));
  ball(0.56, 0.47, 0.92);
  ball(0.41, 1.12);
  ball(0.3, 1.63);

  for (const u of [-0.15, 0.05, 0.25]) coal(on(1.12, 0.41, u / 0.41, 0), 0.045);
  for (const u of [-0.32, 0.32]) coal(on(1.63, 0.3, 0.28, u), 0.035);
  for (let m = 0; m < 5; m++)
    coal(on(1.63, 0.3, -0.25 - 0.08 * Math.sin((m / 4) * Math.PI), -0.36 + m * 0.18), 0.022);

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

function wallLights(glows: Glows, cx: number, cz: number, r: number, bricks: Brick[][]) {
  const L = LIGHTS;
  const bins = new Uint8Array(360);
  let top = G;
  for (const brick of bricks) {
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

function plazaBricks(): Brick[][] {
  return brickRing(0, 0, RADIUS, "#000000", 4242, stretchesFrom(PIECES, OPEN)).flatMap(
    ({ corners }) => {
      const zs = corners.map((p) => p[2]);

      if (Math.max(...zs) - Math.min(...zs) > WALL_HIGHEST) return [];
      return [corners.map((p): Brick => [p[0], p[2] - BRICK_GROUND, p[1]])];
    },
  );
}

function ringOf(cx: number, cz: number, bricks: Brick[][]) {
  const d = bricks
    .flat()
    .map(([x, , z]) => Math.hypot(x - cx, z - cz))
    .filter((v) => v > WALL_REACH[0] && v < WALL_REACH[1])
    .sort((a, b) => a - b);
  return d.length ? d[Math.floor(d.length / 2)] : 0;
}

const FL = TREE_LIGHTS;
const GLOW_VERTEX = `
  attribute vec3 tint;
  attribute vec4 glow;
  attribute float chase;
  uniform float uTime;
  uniform float uScale;
  uniform float uLeast;
  ${WAVE_GLSL}
  varying vec3 vTint;
  varying float vLit;
  varying float vBulb;
  varying float vChase;
  void main() {
    vec3 p = position;
    float rise = waveRise(waveSeen((modelMatrix * vec4(p, 1.0)).xyz));
    p.y = waveG + (p.y - waveG) * rise;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vLit = glow.z > 0.0 ? 0.62 + 0.38 * sin(uTime * glow.z + glow.y) : 1.0;
    vChase = step(0.0, chase);
    if (chase >= 0.0) {
      float turn = mod(uTime / ${FL.step.toFixed(2)} - chase, ${FL.colors.length.toFixed(1)});
      vLit = ${FL.dim.toFixed(2)} + ${(1 - FL.dim).toFixed(2)} * smoothstep(0.0, 0.6, turn) * (1.0 - smoothstep(1.0, 1.6, turn));
    }
    vTint = tint;
    vBulb = glow.w;
    gl_PointSize = max(glow.x * uScale / -mv.z, uLeast) * (0.8 + 0.3 * vLit) * step(0.5, rise);
  }
`;

const GLOW_FRAGMENT = `
  varying vec3 vTint;
  varying float vLit;
  varying float vBulb;
  varying float vChase;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float bulb = vBulb * (1.0 - smoothstep(0.42, 0.55, d)), hot = vBulb * (1.0 - smoothstep(0.0, 0.3, d)), halo = (1.0 - d) * (1.0 - d);
    vec3 c = mix(vTint * mix(0.75 + 0.35 * vLit, 0.7 + 0.6 * vLit, vChase), vec3(1.0, 0.98, 0.9), hot * 0.7 * vLit);
    gl_FragColor = vec4(c, max(bulb, halo * (0.45 + 0.45 * vChase) * vLit));
    #include <colorspace_fragment>
  }
`;

const S = SNOWFALL;
const SNOW_VERTEX = `
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
const SNOW_FRAGMENT = `
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

    wallLights(lights, 0, 0, RADIUS, plazaBricks());

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
    g.setAttribute("glow", new Float32BufferAttribute(lights.glow, 4));
    g.setAttribute("chase", new Float32BufferAttribute(lights.chase, 1));
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

    const random = rng(S.seed);
    const seed = new Float32Array(S.count * 4).map(() => random());
    const g = new BufferGeometry();

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
