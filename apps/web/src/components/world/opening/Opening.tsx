"use client";

import { Html, useProgress } from "@react-three/drei";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { type RefObject, Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  type Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  MeshStandardMaterial,
  type PerspectiveCamera,
  PlaneGeometry,
  Points,
  Quaternion,
  RingGeometry,
  ShaderMaterial,
  ShapeGeometry,
  SphereGeometry,
  SRGBColorSpace,
  type Texture,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import { type Font, FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { SETTLE_FRAMES } from "../constants/ui/Loading.constants";
import { HOWL } from "../constants/palette.constants";
import {
  BELL,
  DING,
  DRESS,
  FILLING,
  FIT,
  FLOURISH,
  FONT,
  INK,
  INKWELL,
  JINGLE,
  MOVES,
  NIB,
  PAPER_SNOW,
  PRESSED,
  QUILL,
  READY,
  REACH_MOST,
  Phase,
} from "../constants/opening/Opening.constants";
import { rng } from "../utils/random";
import { useRoomLight, withRoomLight } from "../utils/roomLight";
import { isWinter } from "../utils/season";
import { ownWave, waveAll, waveDone, WAVE_UNIFORMS } from "../utils/wave";
import { GROUND_Y, PAPER, WAVE } from "../constants/wave.constants";
import { SUN_AT } from "../constants/core/WorldLights.constants";
import { easeOutCubic } from "../utils/curves";
import { softDot } from "../utils/softDot";

export type Intro = { on: boolean; arrived: boolean };

export type OpeningWords = {
  enter: string;
  building: string;
  buildingWinter: string;
  ready: string;
};

type View = { right: Vector3; up: Vector3; away: Vector3; toward: Vector3 };
type Page = { go: HTMLButtonElement | null; say: HTMLParagraphElement | null; goAt: Group | null };

type Hand = { words: [number, number][]; letters: number };

type Piece = {
  mesh: Mesh;
  shown: { value: number };
  write: number;
  t0: number;
  pen: (a: number) => Vector3;
};

type Move = { t0: number; t1: number; f: (x: number) => Vector3; turn: (x: number) => number };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const back = (x: number) => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2;

function turned(points: number[][]) {
  const g = new LatheGeometry(
    points.map(([x, y]) => new Vector2(x, y)),
    72,
  );
  g.computeVertexNormals();
  const P = g.getAttribute("position").array;
  const N = g.getAttribute("normal").array as Float32Array;
  let best = 0;
  let sign = 1;
  for (let i = 0; i < P.length; i += 3) {
    const r = Math.hypot(P[i], P[i + 2]);
    if (r > best) {
      best = r;
      sign = Math.sign(N[i] * P[i] + N[i + 2] * P[i + 2]) || 1;
    }
  }

  if (sign < 0) {
    const index = g.getIndex();
    if (index)
      for (let i = 0; i < index.count; i += 3) {
        const b = index.getX(i + 1);
        index.setX(i + 1, index.getX(i + 2));
        index.setX(i + 2, b);
      }
    g.computeVertexNormals();
  }
  return g;
}

function shineOf(c: string[]) {
  const S = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const x = canvas.getContext("2d");
  if (x) {
    x.beginPath();
    x.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
    x.clip();
    let g = x.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, c[0]);
    g.addColorStop(0.46, c[1]);
    g.addColorStop(0.62, c[2]);
    g.addColorStop(1, c[3]);
    x.fillStyle = g;
    x.fillRect(0, 0, S, S);

    g = x.createRadialGradient(S * 0.34, S * 0.3, 0, S * 0.5, S * 0.5, S * 0.55);
    g.addColorStop(0, "rgba(255,255,255,0.18)");
    g.addColorStop(0.6, "rgba(0,0,0,0)");
    g.addColorStop(0.9, "rgba(0,0,0,0.12)");
    g.addColorStop(1, "rgba(0,0,0,0.3)");
    x.fillStyle = g;
    x.fillRect(0, 0, S, S);
    for (const [hx, hy, hr, ha] of [
      [0.33, 0.27, 0.12, 0.95],
      [0.64, 0.24, 0.06, 0.55],
    ]) {
      g = x.createRadialGradient(S * hx, S * hy, 0, S * hx, S * hy, S * hr);
      g.addColorStop(0, `rgba(255,255,255,${ha})`);
      g.addColorStop(0.45, `rgba(255,255,255,${ha * 0.6})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, S, S);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function ding(audio: AudioContext, at: number, soft: boolean) {
  try {
    if (audio.state === "suspended") void audio.resume();
    const t0 = audio.currentTime + at;
    const out = audio.createGain();
    out.gain.value = DING.volume * (soft ? DING.soft : 1);
    out.connect(audio.destination);
    for (const [times, loud, long] of DING.partials) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.frequency.value = DING.note * times;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(loud, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + long);
      o.connect(g);
      g.connect(out);
      o.start(t0);
      o.stop(t0 + long + 0.05);
    }
    const noise = audio.createBuffer(1, Math.round(audio.sampleRate * 0.03), audio.sampleRate);
    const w = noise.getChannelData(0);
    for (let i = 0; i < w.length; i++) w[i] = (Math.random() * 2 - 1) * (1 - i / w.length) ** 3;
    const tap = audio.createBufferSource();
    const pass = audio.createBiquadFilter();
    const gain = audio.createGain();
    tap.buffer = noise;
    pass.type = "bandpass";
    pass.frequency.value = DING.tap[0];
    gain.gain.value = DING.tap[1];
    tap.connect(pass);
    pass.connect(gain);
    gain.connect(out);
    tap.start(t0);

    const J = JINGLE;
    if (J && !soft)
      for (let h = 0; h < J.hits; h++) {
        const half = J.hits / 2;
        const th =
          t0 + J.start + (h < half ? 0 : J.gap) + (h % half) * J.step + Math.random() * 0.02;
        for (const note of J.notes) {
          const o = audio.createOscillator();
          const g = audio.createGain();
          o.frequency.value = note * (0.97 + Math.random() * 0.06);
          g.gain.setValueAtTime(0.0001, th);
          g.gain.exponentialRampToValueAtTime(J.loud * (0.5 + Math.random() * 0.5), th + 0.003);
          g.gain.exponentialRampToValueAtTime(0.0001, th + J.ring);
          o.connect(g);
          g.connect(out);
          o.start(th);
          o.stop(th + J.ring + 0.02);
        }
      }
  } catch {}
}

type Keep = <T extends { dispose: () => void }>(x: T) => T;

function hollyLeaf(keep: Keep) {
  const rows = 32;
  const [len, wide, fold] = DRESS.leaf;
  const position: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const outline = Math.sin(Math.PI * Math.min(1, t * 1.04)) ** 0.7;
    const spike = Math.max(...[0.24, 0.5, 0.75].map((c) => Math.exp(-(((t - c) / 0.045) ** 2))));
    const w = wide * outline * (0.62 + 0.5 * spike);
    const y = len * t;
    const curl = -0.1 * len * (t - 0.5) * (t - 0.5);
    position.push(-w, y, curl + fold * w, 0, y, curl, w, y, curl + fold * w);
    if (i < rows)
      for (let j = 0; j < 2; j++) {
        const a = i * 3 + j;
        index.push(a, a + 1, a + 3, a + 1, a + 4, a + 3);
      }
  }
  const g = keep(new BufferGeometry());
  g.setAttribute("position", new Float32BufferAttribute(position, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

function dress(bell: Group, dome: Group, shine: (c: string[]) => MeshMatcapMaterial, keep: Keep) {
  const shiny = (c: string[]) => {
    const m = shine(c);
    m.side = DoubleSide;
    return m;
  };
  const [leafLook, berryLook, ribbonLook] = [
    shiny(DRESS.colors.holly),
    shine(DRESS.colors.berry),
    shiny(DRESS.colors.ribbon),
  ];
  const az = ((45 + DRESS.at) * Math.PI) / 180;
  const foot = new Vector3(Math.cos(az) * 1.12, 0.34, Math.sin(az) * 1.12);
  const sprig = new Group();

  for (const [turn, down] of DRESS.leaves) {
    const a = az + (turn * Math.PI) / 180;
    const dir = new Vector3(Math.cos(a), -down, Math.sin(a)).normalize();
    const side = new Vector3().crossVectors(dir, new Vector3(0, 1, 0)).normalize();
    const face = new Vector3().crossVectors(side, dir);
    const leaf = new Mesh(hollyLeaf(keep), leafLook);
    leaf.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(side, dir, face));
    leaf.position.copy(foot);
    sprig.add(leaf);
  }
  for (const [x, y, z] of DRESS.berries) {
    const berry = new Mesh(keep(new SphereGeometry(DRESS.berry, 16, 12)), berryLook);
    berry.position.set(foot.x + x, foot.y + y, foot.z + z);
    sprig.add(berry);
  }
  bell.add(sprig);

  const bow = new Group();
  for (const side of [-1, 1]) {
    const loop = new Mesh(keep(new TorusGeometry(0.1, 0.05, 12, 28)), ribbonLook);
    loop.scale.set(1.05, 0.72, 0.45);
    loop.position.set(side * 0.13, 0.03, 0);
    loop.rotation.z = side * 0.3;
    const tail = new Mesh(keep(new BoxGeometry(0.075, 0.24, 0.02)), ribbonLook);
    tail.position.set(side * 0.06, -0.12, 0.012);
    tail.rotation.z = side * 0.38;
    bow.add(loop, tail);
  }
  const knot = new Mesh(keep(new SphereGeometry(0.06, 14, 10)), ribbonLook);
  knot.scale.set(1, 1, 0.75);
  knot.position.z = 0.015;
  bow.add(knot);
  const front = Math.PI / 4;
  bow.position.set(Math.cos(front) * 0.2, 1.5, Math.sin(front) * 0.2);
  bow.rotation.y = Math.PI / 2 - front;
  dome.add(bow);
}

const SN = PAPER_SNOW;
const PAPER_SNOW_VERTEX = `
  uniform float snowTime;
  uniform vec3 snowAt;
  uniform vec2 snowBox;
  uniform float snowScale;
  uniform float snowFade;
  attribute vec4 seed;
  varying float vA;
  void main() {
    float h = fract(seed.y - snowTime * (${SN.fall[0].toFixed(3)} + ${SN.fall[1].toFixed(3)} * seed.w));
    float sway = sin(snowTime * (0.6 + 0.9 * seed.w) + seed.y * 40.0) * ${SN.sway.toFixed(2)};
    vec2 xz = seed.xz * snowBox.x + vec2(sway + snowTime * ${SN.drift.toFixed(2)}, sway * 0.6);
    xz = mod(xz + snowBox.x, 2.0 * snowBox.x) - snowBox.x;
    vec4 mv = modelViewMatrix * vec4(snowAt + vec3(xz.x, h * snowBox.y, xz.y), 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = ${SN.size.toFixed(2)} * (0.55 + 0.9 * seed.w) * snowScale / -mv.z;
    vA = snowFade * smoothstep(0.0, 0.04, h) * smoothstep(1.0, 0.85, h) * (0.65 + 0.35 * seed.w);
  }
`;
const PAPER_SNOW_FRAGMENT = `
  uniform vec3 snowColor;
  uniform vec3 snowRim;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5), a = vA * smoothstep(0.5, 0.2, d);
    if (a < 0.01) discard;
    gl_FragColor = vec4(mix(snowColor, snowRim, smoothstep(0.12, 0.42, d)), a);
    #include <colorspace_fragment>
  }
`;

function paperSnow(keep: Keep) {
  const random = rng(SN.seed);
  const seeds = new Float32Array(SN.count * 4);
  for (let i = 0; i < SN.count; i++)
    seeds.set([random() * 2 - 1, random(), random() * 2 - 1, random()], i * 4);
  const g = keep(new BufferGeometry());
  g.setAttribute("position", new BufferAttribute(new Float32Array(SN.count * 3), 3));
  g.setAttribute("seed", new BufferAttribute(seeds, 4));
  const flakes = new Points(
    g,
    keep(
      ownWave(
        new ShaderMaterial({
          uniforms: {
            snowTime: { value: 0 },
            snowAt: { value: new Vector3() },
            snowBox: { value: new Vector2(1, 1) },
            snowScale: { value: 1 },
            snowFade: { value: 1 },
            snowColor: { value: new Color(SN.color) },
            snowRim: { value: new Color(SN.rim) },
          },
          vertexShader: PAPER_SNOW_VERTEX,
          fragmentShader: PAPER_SNOW_FRAGMENT,
          transparent: true,
          depthWrite: false,
        }),
      ),
    ),
  );
  flakes.frustumCulled = false;
  flakes.renderOrder = 3;
  flakes.userData.noWave = true;
  return flakes;
}

function build(font: Font, light: Texture, view: View) {
  const trash: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    trash.push(x);
    return x;
  };
  const standard = (options: ConstructorParameters<typeof MeshStandardMaterial>[0]) =>
    keep(
      withRoomLight(
        keep(
          new MeshStandardMaterial({ roughness: 1, metalness: 0, side: DoubleSide, ...options }),
        ),
        light,
      ) as Material,
    );
  const { right: RIGHT, away: BACK, toward: DIR } = view;
  const UP = new Vector3(0, 1, 0);
  const welcome = new Group();
  welcome.userData.noWave = true;

  const blotTexture = keep(
    softDot(128, [
      [0, "rgba(255,255,255,1)"],
      [0.55, "rgba(255,255,255,0.55)"],
      [1, "rgba(255,255,255,0)"],
    ]),
  );
  const blot = (w: number, d: number, opacity: number) => {
    const material = keep(
      new MeshBasicMaterial({
        map: blotTexture,
        color: HOWL.light.shade,
        transparent: true,
        opacity,
        depthWrite: false,
      }),
    );
    const m = new Mesh(keep(new PlaneGeometry(w, d)), material);
    m.rotation.set(-Math.PI / 2, 0, 0, "YXZ");
    m.renderOrder = 1;
    m.userData.opacity = opacity;
    welcome.add(m);
    return m;
  };

  const onPaper = (x: number, y: number, h: number) =>
    new Vector3()
      .addScaledVector(RIGHT, x)
      .addScaledVector(BACK, y * INK.stand)
      .setY(h);
  const inked = (g: BufferGeometry, along: Float32Array, ink: string = INK.color) => {
    const material = keep(
      new MeshBasicMaterial({
        color: ink,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        fog: false,
      }),
    );
    const shown = { value: -1 };
    material.onBeforeCompile = (shader) => {
      shader.uniforms.waveC = WAVE_UNIFORMS.waveC;
      shader.uniforms.waveR = WAVE_UNIFORMS.waveR;
      shader.uniforms.waveW = WAVE_UNIFORMS.waveW;
      shader.uniforms.inkShown = shown;
      shader.vertexShader = `attribute float along;\nvarying float vAlong;\nvarying vec2 vInkGround;\n${shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvAlong = along;\nvInkGround = (modelMatrix * vec4(transformed, 1.0)).xz;",
      )}`;
      shader.fragmentShader = `uniform vec2 waveC;\nuniform float waveR;\nuniform float waveW;\nuniform float inkShown;\nvarying float vAlong;\nvarying vec2 vInkGround;\n${shader.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.a *= smoothstep(0.0, 0.012, inkShown - vAlong) * (1.0 - smoothstep(0.0, 0.3 * waveW, waveR - length(vInkGround - waveC)));",
      )}`;
    };
    g.setAttribute("along", new BufferAttribute(along, 1));
    const mesh = new Mesh(g, material);
    mesh.renderOrder = 2;
    welcome.add(mesh);
    return { mesh, shown };
  };

  const resolution = font.data.resolution;
  const pieces: Piece[] = INK.lines.map((L) => {
    const hand = font.data.glyphs[L.glyph] as unknown as Hand;
    const s = L.size;
    const k = s / resolution;
    const g = keep(new ShapeGeometry(font.generateShapes(L.glyph, s), 6));
    const P = g.getAttribute("position").array;
    const n = P.length / 3;
    const A = new Float32Array(n);
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < n; i++) {
      A[i] = P[i * 3] - P[i * 3 + 1] * INK.slant;
      lo = Math.min(lo, A[i]);
      hi = Math.max(hi, A[i]);
    }
    for (let i = 0; i < n; i++) A[i] = (A[i] - lo) / (hi - lo);
    g.applyMatrix4(
      new Matrix4()
        .makeBasis(RIGHT, BACK.clone().multiplyScalar(INK.stand), UP)
        .setPosition(onPaper(L.at[0], L.at[1], INK.lift)),
    );
    const gaps = hand.words
      .slice(1)
      .map((w, j) => [(hand.words[j][1] * k - lo) / (hi - lo), (w[0] * k - lo) / (hi - lo)]);
    return {
      ...inked(g, A, L.ink),
      write: L.write,
      t0: 0,
      pen: (a: number) => {
        const y = s * (NIB.mid + NIB.bob * Math.sin(a * Math.PI * 2 * hand.letters));
        let up = 0;
        for (const [q0, q1] of gaps)
          if (a > q0 && a < q1) up = Math.sin((Math.PI * (a - q0)) / (q1 - q0));
        return onPaper(
          L.at[0] + lo + a * (hi - lo) + y * INK.slant,
          L.at[1] + y,
          INK.lift + up * s * NIB.hop,
        );
      },
    };
  });

  {
    const F = FLOURISH;
    const p = [
      [F.from, F.at],
      [F.from + (F.to - F.from) * 0.3, F.at - F.sag],
      [F.from + (F.to - F.from) * 0.7, F.at - F.sag * 0.6],
      [F.to, F.at + F.rise],
    ];
    const c = (t: number) => {
      const u = 1 - t;
      return [0, 1].map(
        (j) =>
          u * u * u * p[0][j] +
          3 * u * u * t * p[1][j] +
          3 * u * t * t * p[2][j] +
          t * t * t * p[3][j],
      );
    };
    const N = 64;
    const position = new Float32Array((N + 1) * 6);
    const A = new Float32Array((N + 1) * 2);
    const index: number[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const q = c(t);
      const q0 = c(Math.max(0, t - 0.01));
      const q1 = c(Math.min(1, t + 0.01));
      const dx = q1[0] - q0[0];
      const dy = q1[1] - q0[1];
      const l = Math.hypot(dx, dy) || 1;
      const w = (F.width / 2) * (0.12 + 0.88 * Math.sin(Math.PI * t ** 0.75));
      for (let j = 0; j < 2; j++) {
        const v = onPaper(
          q[0] + ((j ? dy : -dy) / l) * w,
          q[1] + ((j ? -dx : dx) / l) * w,
          INK.lift,
        );
        position.set([v.x, v.y, v.z], (i * 2 + j) * 3);
        A[i * 2 + j] = t;
      }
      if (i < N) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = keep(new BufferGeometry());
    g.setAttribute("position", new BufferAttribute(position, 3));
    g.setIndex(index);
    pieces.push({
      ...inked(g, A, F.ink),
      write: F.write,
      t0: 0,
      pen: (a: number) => {
        const q = c(a);
        return onPaper(q[0], q[1], INK.lift);
      },
    });
  }

  const IS = INKWELL.size;
  const DESK = onPaper(INKWELL.at[0], INKWELL.at[1], 0);
  const desk = new Group();
  const quill = new Group();
  desk.position.copy(DESK);
  welcome.add(desk);
  desk.add(quill);
  for (const [outline, color] of [
    [
      [
        [0, 0],
        [0.6, 0],
        [0.65, 0.04],
        [0.67, 0.13],
        [0.67, 0.47],
        [0.61, 0.6],
        [0.45, 0.7],
        [0.3, 0.76],
        [0.25, 0.8],
        [0.25, 0.9],
      ],
      INKWELL.glass,
    ],
    [
      [
        [0.678, 0.17],
        [0.678, 0.4],
      ],
      INKWELL.label,
    ],
    [
      [
        [0.2, 0.96],
        [0.24, 0.985],
        [0.315, 0.975],
        [0.335, 0.92],
        [0.31, 0.88],
        [0.23, 0.87],
      ],
      INKWELL.lip,
    ],
  ] as [number[][], string][]) {
    const g = keep(turned(outline));
    g.scale(IS, IS, IS);
    desk.add(new Mesh(g, standard({ color })));
  }
  const well = keep(new CircleGeometry(0.21 * IS, 32));
  well.rotateX(-Math.PI / 2);
  well.translate(0, 0.93 * IS, 0);
  desk.add(new Mesh(well, standard({ color: INKWELL.ink })));

  const LQ = QUILL.length;
  const lean = (d: [number, number, number]) => {
    const dir = new Vector3()
      .addScaledVector(RIGHT, d[0])
      .addScaledVector(UP, d[1])
      .addScaledVector(BACK, d[2])
      .normalize();
    const side = new Vector3().crossVectors(dir, DIR).normalize();
    const face = new Vector3().crossVectors(side, dir);
    return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(side, dir, face));
  };
  const WRITES = lean(QUILL.write);
  const RESTS = lean(QUILL.rest).multiply(WRITES.clone().invert());
  const NONE = new Quaternion();

  const spine = (t: number) => new Vector3(-QUILL.bend * LQ * Math.max(0, t - 0.2) ** 2, t * LQ, 0);

  const tube = (t0: number, t1: number, r0: number, r1: number) => {
    const rows = 16;
    const sides = 12;
    const position: number[] = [];
    const index: number[] = [];
    for (let i = 0; i <= rows; i++) {
      const t = t0 + ((t1 - t0) * i) / rows;
      const r = r0 + ((r1 - r0) * i) / rows;
      const c = spine(t);
      for (let j = 0; j <= sides; j++) {
        const a = (j / sides) * Math.PI * 2;
        position.push(c.x + Math.cos(a) * r, c.y, c.z + Math.sin(a) * r);
      }
      if (i < rows)
        for (let j = 0; j < sides; j++) {
          const e = i * (sides + 1) + j;
          const f = e + sides + 1;
          index.push(e, f, e + 1, e + 1, f, f + 1);
        }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(position, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    return g;
  };

  const vane = () => {
    const rows = 40;
    const cols = [-0.7, -0.35, 0, 0.3, 0.65, 1];
    const position: number[] = [];
    const color: number[] = [];
    const index: number[] = [];
    const inner = new Color(QUILL.colors.inner);
    const edge = new Color(QUILL.colors.vane);
    for (let i = 0; i <= rows; i++) {
      const t = 0.24 + (0.76 * i) / rows;
      const w = Math.max(0, Math.sin((Math.PI * (t - 0.24)) / 0.78)) ** 0.65 * QUILL.vane * LQ;
      for (const cx of cols) {
        const cut = Math.abs(cx) > 0.35 && QUILL.splits.includes(cx < 0 ? -i : i);
        const x = cx * w * (cut ? 0.5 : 1);
        const c = spine(t - (cut ? 0.02 : 0));
        position.push(c.x + x, c.y, -QUILL.cup * x * x);
        const tint = Math.abs(cx) <= 0.3 ? inner : edge;
        color.push(tint.r, tint.g, tint.b);
      }
      if (i < rows)
        for (let j = 0; j < cols.length - 1; j++) {
          const e = i * cols.length + j;
          const f = e + cols.length;
          index.push(e, e + 1, f, e + 1, f + 1, f);
        }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(position, 3));
    g.setAttribute("color", new Float32BufferAttribute(color, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    return g;
  };
  const C = QUILL.colors;
  for (const [g, material] of [
    [tube(0, 0.08, 0.005, QUILL.nib), standard({ color: C.tip })],
    [tube(0.07, 0.24, QUILL.nib, QUILL.nib * 0.9), standard({ color: C.nib })],
    [tube(0.22, 1, QUILL.shaft[0], QUILL.shaft[1]), standard({ color: C.shaft })],
    [vane(), standard({ vertexColors: true })],
    [new SphereGeometry(QUILL.nib * 0.6, 10, 8), standard({ color: INK.color })],
  ] as [BufferGeometry, Material][]) {
    keep(g).applyMatrix4(new Matrix4().makeRotationFromQuaternion(WRITES));
    quill.add(new Mesh(g, material));
  }

  const SHADE = new Vector3(-SUN_AT[0] / SUN_AT[1], 0, -SUN_AT[2] / SUN_AT[1]);
  const wellShadow = blot(IS * 2.1, IS * 2.1, 0.22);
  const shaftShadow = blot(1, 1, 0.16);
  const vaneShadow = blot(1, 1, 0.14);
  wellShadow.position
    .copy(DESK)
    .addScaledVector(SHADE, IS * 0.3)
    .setY(0.003);

  const M = MOVES;
  const REST = DESK.clone().setY(IS * 0.5);
  const OUT = REST.clone().add(
    UP.clone()
      .applyQuaternion(lean(QUILL.rest))
      .multiplyScalar(IS * 0.9),
  );
  const moves: Move[] = [];
  let T = 0;
  const move = (ms: number, f: Move["f"], turn: Move["turn"]) => {
    moves.push({ t0: T, t1: T + ms, f, turn });
    T += ms;
  };
  const arc = (a: Vector3, b: Vector3, lift: number) => (x: number) => {
    const e = easeInOut(x);
    return a
      .clone()
      .lerp(b, e)
      .setY(a.y + (b.y - a.y) * e + lift * 4 * e * (1 - e));
  };
  const turning = (a: number, b: number) => (x: number) => a + (b - a) * easeInOut(x);
  move(M.wait, arc(REST, REST, 0), turning(0, 0));
  move(M.out, arc(REST, OUT, 0), turning(0, 0.4));
  pieces.forEach((p, i) => {
    move(
      i ? M.next : M.reach,
      arc(i ? pieces[i - 1].pen(1) : OUT, p.pen(0), i ? M.lift * 0.6 : M.lift),
      i ? turning(1, 1) : turning(0.4, 1),
    );
    p.t0 = T;
    move(p.write, p.pen, turning(1, 1));
  });
  const WRITTEN = T;
  move(M.back, arc(pieces[pieces.length - 1].pen(1), OUT, M.lift), turning(1, 0.4));
  move(M.dip, arc(OUT, REST, 0), turning(0.4, 0));
  const DONE = T;

  const shaft = new Vector3();
  const across = new Vector3();
  const SHAFT = UP.clone().applyQuaternion(WRITES);
  const ACROSS = new Vector3(1, 0, 0).applyQuaternion(WRITES);
  const shadow = (m: Mesh, nib: Vector3, t0: number, t1: number, w: number) => {
    const a = nib.clone().addScaledVector(shaft, LQ * t0);
    const b = nib.clone().addScaledVector(shaft, LQ * t1);
    a.addScaledVector(SHADE, a.y);
    b.addScaledVector(SHADE, b.y);
    m.position.set((a.x + b.x) / 2, 0.004, (a.z + b.z) / 2);
    m.scale.set(Math.hypot(b.x - a.x, b.z - a.z) + w, w, 1);
    m.rotation.set(-Math.PI / 2, Math.atan2(-(b.z - a.z), b.x - a.x), 0, "YXZ");
  };
  const writeAt = (tq: number) => {
    for (const p of pieces) p.shown.value = clamp01((tq - p.t0) / p.write) * 1.03 - 0.015;
    const m = moves.find((it) => tq < it.t1) ?? moves[moves.length - 1];
    const x = clamp01((tq - m.t0) / (m.t1 - m.t0));
    const nib = m.f(x);
    quill.position.copy(nib).sub(DESK);
    quill.quaternion.copy(RESTS).slerp(NONE, m.turn(x));
    shaft.copy(SHAFT).applyQuaternion(quill.quaternion);
    across.copy(ACROSS).applyQuaternion(quill.quaternion);
    shadow(shaftShadow, nib, 0, 0.32, QUILL.shaft[0] * 5);
    shadow(vaneShadow, nib, 0.26, 1, QUILL.vane * LQ * 1.5);
    return nib;
  };

  const BC = BELL.colors;
  const shine = (c: string[]) => keep(new MeshMatcapMaterial({ matcap: keep(shineOf(c)) }));
  const bell = new Group();
  const dome = new Group();
  const knob = new Group();
  const R = BELL.radius;
  const part = (g: BufferGeometry, m: Material, into: Group) => into.add(new Mesh(keep(g), m));
  part(
    turned([
      [0, 0],
      [1.24, 0],
      [1.32, 0.03],
      [R, 0.1],
      [R, 0.2],
      [1.32, 0.28],
      [1.25, 0.32],
      [1.17, 0.335],
      [0.9, 0.335],
    ]),
    shine(BC.black),
    bell,
  );

  const arch = [
    [1.0, 0.31],
    [1.05, 0.35],
    [1.075, 0.4],
    [1.065, 0.44],
    [1.02, 0.46],
    [0.985, 0.48],
  ];
  for (let i = 1; i <= 14; i++) {
    const a = (i / 14) * (Math.PI / 2);
    arch.push([0.985 * Math.cos(a), 0.48 + 0.88 * Math.sin(a)]);
  }
  part(turned(arch), shine(BC.yellow), dome);
  const chrome = shine(BC.chrome);
  part(
    turned([
      [0, 0],
      [0.19, 0],
      [0.21, 0.03],
      [0.17, 0.08],
      [0.13, 0.13],
      [0.16, 0.19],
      [0.155, 0.24],
      [0.09, 0.27],
      [0.06, 0.28],
      [0, 0.28],
    ]).translate(0, 1.34, 0),
    chrome,
    dome,
  );
  part(
    turned([
      [0, 0],
      [0.05, 0],
      [0.05, 0.42],
      [0.17, 0.43],
      [0.19, 0.455],
      [0.185, 0.48],
      [0.15, 0.5],
      [0, 0.505],
    ]),
    chrome,
    knob,
  );
  dome.add(knob);
  bell.add(dome);
  if (isWinter()) dress(bell, dome, shine, keep);
  const track = new Mesh(
    keep(new RingGeometry(1.07, 1.18, 96, 1)),
    keep(new MeshBasicMaterial({ color: BELL.track, side: DoubleSide })),
  );
  const ring = new Mesh(
    keep(new RingGeometry(1.07, 1.18, 96, 1, (3 * Math.PI) / 4, -Math.PI * 2)),
    keep(new MeshBasicMaterial({ color: BELL.ring, side: DoubleSide })),
  );
  for (const m of [track, ring]) {
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.339;
    bell.add(m);
  }
  ring.position.y += 0.002;
  ring.geometry.setDrawRange(0, 0);
  const bellShadow = blot(R * 3.1, R * 3.1, 0.24);
  bellShadow.position.y = 0.003;
  welcome.add(bell);

  const pulses = [0, 1].map(() => {
    const m = new Mesh(
      keep(new RingGeometry(1, 1.045, 96, 1)),
      keep(
        new MeshBasicMaterial({
          color: BELL.ring,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      ),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.006;
    m.userData.then = -1e9;
    welcome.add(m);
    return m;
  });

  const set: Vector3[] = [];
  const swing: Vector3[] = [];
  for (const p of pieces) {
    const P = p.mesh.geometry.getAttribute("position");
    for (let i = 0; i < P.count; i += 3) set.push(new Vector3().fromBufferAttribute(P, i));
  }
  for (let a = 0; a < 16; a++) {
    const c = Math.cos((a / 8) * Math.PI);
    const s = Math.sin((a / 8) * Math.PI);
    set.push(
      new Vector3(c * R * 1.3, 0, s * R * 1.3),
      new Vector3(c * R, 2.4, s * R),
      new Vector3(c * IS * 0.7, 0, s * IS * 0.7).add(DESK),
      new Vector3(c * IS * 0.7, IS, s * IS * 0.7).add(DESK),
    );
  }
  const quillAt = (t: number, into: Vector3[]) => {
    const nib = writeAt(t);
    into.push(
      nib.clone().addScaledVector(shaft, LQ),
      nib
        .clone()
        .addScaledVector(shaft, LQ * 0.6)
        .addScaledVector(across, QUILL.vane * LQ),
      nib
        .clone()
        .addScaledVector(shaft, LQ * 0.6)
        .addScaledVector(across, -QUILL.vane * LQ),
    );
  };
  for (let t = 0; t < DONE; t += 50) quillAt(t, swing);
  quillAt(DONE, set);

  return {
    welcome,
    desk,
    bell,
    dome,
    knob,
    ring,
    pulses,
    shadows: { bell: bellShadow, well: wellShadow, shaft: shaftShadow, vane: vaneShadow },
    writeAt,
    WRITTEN,
    DONE,
    box: { set, swing },
    trash,
  };
}

function spread(
  camera: PerspectiveCamera,
  root: Group,
  pts: Vector3[],
  around?: { x: number; y: number },
) {
  const seen = new Vector3();
  const lo = [Infinity, Infinity];
  const hi = [-Infinity, -Infinity];
  for (const p of pts) {
    seen.copy(p).applyMatrix4(root.matrixWorld).project(camera);
    lo[0] = Math.min(lo[0], seen.x);
    lo[1] = Math.min(lo[1], seen.y);
    hi[0] = Math.max(hi[0], seen.x);
    hi[1] = Math.max(hi[1], seen.y);
  }
  const m = around ?? { x: (lo[0] + hi[0]) / 2, y: (lo[1] + hi[1]) / 2 };
  return {
    x: m.x,
    y: m.y,
    w: Math.max(hi[0] - m.x, m.x - lo[0]),
    h: Math.max(hi[1] - m.y, m.y - lo[1]),
  };
}

function makeWelcome(font: Font, light: Texture, view: View, still: boolean) {
  const parts = build(font, light, view);
  const { welcome, desk, bell, dome, knob, ring, pulses, shadows, writeAt, WRITTEN, DONE, box } =
    parts;
  const B = BELL;

  const flakes =
    isWinter() && !still
      ? paperSnow((x) => {
          parts.trash.push(x);
          return x;
        })
      : null;
  const aim = new Vector3();
  const look = new Vector3();
  const s = {
    phase: Phase.Write,
    t: performance.now(),
    tr: 0,
    last: 0,
    prog: 0,
    goal: FILLING.first,
    lift: -B.rise,
    hoverK: 0,
    hover: false,
    auto: 0,
    size0: 1,
    near: 1,
    far: 1,
    end: 0,

    q0: 0,

    rung: -1e9,
    held: false,
    next: 0,
  };

  let audio: AudioContext | null = null;
  function wake(may: boolean) {
    const active = navigator.userActivation?.hasBeenActive;
    if (audio || typeof AudioContext === "undefined" || !(may || active)) return;
    try {
      audio = new AudioContext();
    } catch {
      audio = null;
    }
  }

  function strike(now: number, soft: boolean) {
    s.rung = now;
    s.held = !soft;
    if (!soft) wake(true);
    if (audio) ding(audio, B.hit / 1000, soft);
    pulses[s.next++ % pulses.length].userData.then = now + B.hit;
  }

  function ringing(now: number) {
    const x = now - s.rung;
    const y = x - B.hit;
    const z = Math.max(0, y - B.hold);
    const down =
      x < B.hit
        ? (Math.max(0, x) / B.hit) ** 2
        : s.held
          ? 1
          : Math.exp(-z / 120) * Math.cos(z * 0.02);
    const hum = y < 0 ? 0 : Math.sin(y * 0.11) * Math.exp(-y / 220) * 0.03;
    dome.scale.set(1 + hum, 1 - hum - 0.03 * Math.max(0, down), 1 + hum);
    const P = READY.ring;
    for (const m of pulses) {
      const q = clamp01((now - m.userData.then) / P.ms);
      const k = B.radius * (1.02 + P.grow * easeOutCubic(q));
      m.scale.set(k, k, 1);
      (m.material as MeshBasicMaterial).opacity = q > 0 && q < 1 ? P.opacity * (1 - q) : 0;
    }
    return down;
  }

  function fit(camera: PerspectiveCamera, width: number, height: number) {
    if (s.phase === Phase.Go || s.phase === Phase.Done || !width || !height) return;
    camera.updateMatrixWorld();
    const ahead = new Vector3().setFromMatrixColumn(camera.matrixWorld, 2).negate();
    const target = camera.position
      .clone()
      .addScaledVector(ahead, (GROUND_Y - camera.position.y) / ahead.y);
    const hh = camera.position.distanceTo(target) * Math.tan((camera.fov * Math.PI) / 360);
    const hw = (hh * width) / height;
    let k = 1;
    welcome.position.copy(target).setY(GROUND_Y);
    for (let it = 0; it < 8; it++) {
      welcome.scale.setScalar(k);
      welcome.updateMatrixWorld(true);
      const a = spread(camera, welcome, box.set);
      const b = spread(camera, welcome, box.swing, a);
      k *= Math.min(
        (width < height ? FIT.narrow : FIT.fill) / a.w,
        FIT.tallest / a.h,
        FIT.swing / b.w,
        FIT.swing / b.h,
      );
      welcome.position
        .addScaledVector(view.right, -a.x * hw)
        .addScaledVector(view.away, (-a.y * hh) / view.up.dot(view.away));
    }
    welcome.scale.setScalar(k);
    welcome.updateMatrixWorld(true);
    WAVE_UNIFORMS.waveC.value.set(welcome.position.x, welcome.position.z);
  }

  function reachAt(camera: PerspectiveCamera, points: [number, number][]) {
    let far = 0;
    const v = new Vector3();
    const c = welcome.position;
    for (const [x, y] of points) {
      v.set(x, y, 0.5).unproject(camera).sub(camera.position);
      const t = v.y < -1e-6 ? (GROUND_Y - camera.position.y) / v.y : 1e9;
      const d = Math.hypot(camera.position.x + v.x * t - c.x, camera.position.z + v.z * t - c.z);
      far = Math.max(far, Math.min(REACH_MOST, d));
    }
    return far;
  }

  function waveAt(t: number) {
    const { near: a, far: b } = PRESSED.wave;
    if (t <= a) return s.near * (t / a) ** 0.75;
    return s.near * (t / a) ** (Math.log(s.far / s.near) / Math.log((a + b) / a));
  }

  function press(camera: PerspectiveCamera, page: Page) {
    if (s.phase !== Phase.Ready) return false;
    s.phase = Phase.Go;
    s.t = performance.now();
    s.q0 = Math.min(DONE, WRITTEN + s.t - s.tr);
    strike(s.t, false);
    if (page.go) page.go.hidden = true;
    if (page.say) page.say.textContent = "";
    if (still) {
      s.phase = Phase.Done;
      return true;
    }
    s.size0 = bell.scale.x;
    s.near =
      reachAt(camera, [
        [-1, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [0, 0.4],
      ]) + WAVE.width;
    s.far = Math.max(
      s.near * 1.05,
      reachAt(camera, [
        [-1, 1],
        [1, 1],
      ]) + WAVE.width,
    );
    return false;
  }

  function snowFalls(camera: PerspectiveCamera, pixelsHigh: number, now: number, t: number) {
    const u = (flakes!.material as ShaderMaterial).uniforms;
    camera.getWorldDirection(look);
    const r = look.y < -0.02 ? (GROUND_Y - camera.position.y) / look.y : 60;
    aim.copy(camera.position).addScaledVector(look, r);
    u.snowTime.value = now / 1000;
    u.snowAt.value.set(aim.x, GROUND_Y, aim.z);
    u.snowBox.value.set(r * Math.max(SN.reach[0], SN.reach[1] * camera.aspect), r * SN.height);
    u.snowScale.value = pixelsHigh / (2 * Math.tan((camera.fov * Math.PI) / 360));
    const tw = s.phase === Phase.Go ? Math.max(0, t - BELL.sink[0] - BELL.sink[1]) : 0;
    u.snowFade.value = s.phase === Phase.Done ? 0 : 1 - clamp01(tw / SN.fade);
  }

  function step(
    camera: PerspectiveCamera,
    height: number,
    ratio: number,
    arrived: boolean,
    page: Page,
    ready: string,
  ) {
    const now = performance.now();
    const t = now - s.t;
    const dt = Math.min(60, now - (s.last || now));
    s.last = now;
    if (flakes) snowFalls(camera, height * ratio, now, t);

    if (s.phase === Phase.Write && (still || t >= WRITTEN)) {
      s.phase = Phase.Build;
      s.goal = FILLING.building;
      wake(false);
    }

    writeAt(
      still
        ? DONE
        : s.phase === Phase.Write
          ? t
          : s.phase === Phase.Build
            ? WRITTEN
            : s.phase === Phase.Go
              ? s.q0 + (DONE - s.q0) * clamp01(t / (BELL.inkwell[0] - 10))
              : WRITTEN + now - s.tr,
    );
    if (s.phase === Phase.Build || s.phase === Phase.Ready) {
      if (s.phase === Phase.Build) {
        const { loaded, total } = useProgress.getState();
        s.goal = arrived ? 1 : Math.max(FILLING.building, total ? (0.9 * loaded) / total : 0);
      }
      s.prog += (s.goal - s.prog) * Math.min(1, dt / FILLING.ms);
      if (s.goal >= 1 && s.prog > 0.995) s.prog = 1;
      ring.geometry.setDrawRange(0, Math.round(96 * s.prog) * 6);
      if (s.phase === Phase.Build && s.prog === 1) {
        s.phase = Phase.Ready;
        s.t = s.tr = now;
        s.auto = now + READY.first;
        if (page.go) page.go.hidden = false;
        if (page.say) page.say.textContent = ready;
      }
    }
    if (s.phase === Phase.Ready) {
      const up = still ? 1 : back(clamp01((now - s.t) / READY.rise));
      const bob = still ? 0 : Math.sin(now / READY.bobMs) * READY.bob;
      s.hoverK += ((s.hover ? 1 : 0) - s.hoverK) * Math.min(1, dt / READY.hoverMs);
      s.lift = -B.rise + B.rise * up + bob + READY.hover * s.hoverK;
      bell.scale.setScalar(1 + READY.grow * s.hoverK);
      if (!still && now >= s.auto) {
        if (!s.hover) strike(now, true);
        s.auto = (now - s.auto > B.again ? now : s.auto) + B.again;
      }
    }
    if (s.phase === Phase.Go) {
      const sink = clamp01((t - B.sink[0]) / B.sink[1]);
      const fall = sink * sink * (1.9 * sink - 0.9);
      bell.position.y = -2.4 * fall;
      bell.scale.setScalar(s.size0 * (1 - 0.2 * Math.max(0, fall)));
      (shadows.bell.material as MeshBasicMaterial).opacity =
        shadows.bell.userData.opacity * (1 - sink);
      bell.visible = sink < 1;

      const whole = PRESSED.wave.near + PRESSED.wave.far;
      const tw = Math.max(0, t - B.sink[0] - B.sink[1]);
      const over = tw >= whole;
      WAVE_UNIFORMS.waveR.value = over ? s.far : waveAt(tw);
      WAVE_UNIFORMS.waveLit.value = 1 - clamp01(tw / whole) ** 4;

      const down = clamp01((t - B.inkwell[0]) / B.inkwell[1]);
      const drop = down * down * (1.9 * down - 0.9);
      desk.position.y = -(INKWELL.size + QUILL.length) * drop;
      desk.scale.setScalar(1 - 0.2 * Math.max(0, drop));
      desk.visible = down < 1;
      for (const m of [shadows.well, shadows.shaft, shadows.vane])
        (m.material as MeshBasicMaterial).opacity = m.userData.opacity * (1 - down);
      if (over && down >= 1) {
        if (!s.end) s.end = now;
        else if (now - s.end > PRESSED.end) s.phase = Phase.Done;
      }
    }

    knob.position.y = B.knob + s.lift - B.press * ringing(now);

    if (s.phase === Phase.Ready && page.goAt && page.go) {
      const p = page.goAt.getWorldPosition(new Vector3());
      const d = p.distanceTo(camera.position);
      const r =
        (1.45 * welcome.scale.x * height) / (2 * d * Math.tan((camera.fov * Math.PI) / 360));
      page.go.style.width = page.go.style.height = `${2 * r}px`;
    }
    return s.phase === Phase.Done;
  }

  return {
    group: welcome,
    snow: flakes,
    fit,
    press,
    step,
    wake: () => wake(true),
    hover: (on: boolean) => {
      s.hover = on;
    },
    dispose: () => {
      parts.trash.forEach((x) => x.dispose());

      const a = audio;
      audio = null;
      if (a) setTimeout(() => void a.close(), 2500);
    },
  };
}

function Welcome({
  intro,
  words,
  onShown,
  onDone,
}: {
  intro: RefObject<Intro>;
  words: OpeningWords;
  onShown: () => void;
  onDone: () => void;
}) {
  const font = useLoader(FontLoader, FONT) as Font;
  const light = useRoomLight();
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const go = useRef<HTMLButtonElement>(null);
  const say = useRef<HTMLParagraphElement>(null);
  const goAt = useRef<Group>(null);
  const welcome = useMemo(() => {
    camera.updateMatrixWorld();
    const ahead = new Vector3().setFromMatrixColumn(camera.matrixWorld, 2).negate();
    const view = {
      right: new Vector3().setFromMatrixColumn(camera.matrixWorld, 0),
      up: new Vector3().setFromMatrixColumn(camera.matrixWorld, 1),
      away: new Vector3(ahead.x, 0, ahead.z).normalize(),
      toward: ahead.clone().negate(),
    };
    return makeWelcome(
      font,
      light,
      view,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, [font, light, camera]);
  useEffect(() => () => welcome.dispose(), [welcome]);
  useLayoutEffect(() => welcome.fit(camera, size.width, size.height), [welcome, camera, size]);
  useEffect(() => {
    if (say.current) say.current.textContent = isWinter() ? words.buildingWinter : words.building;
  }, [words]);

  const page = () => ({ go: go.current, say: say.current, goAt: goAt.current });
  const drawn = useRef(0);
  const finish = () => {
    gl.domElement.focus({ preventScroll: true });
    onDone();
  };
  useFrame(() => {
    if (drawn.current <= SETTLE_FRAMES && ++drawn.current > SETTLE_FRAMES) onShown();
    if (
      welcome.step(
        camera,
        size.height,
        gl.getPixelRatio(),
        intro.current.arrived,
        page(),
        words.ready,
      )
    )
      finish();
  });

  return (
    <>
      {welcome.snow && <primitive object={welcome.snow} />}
      <primitive object={welcome.group}>
        <group ref={goAt} position-y={0.9}>
          <Html center zIndexRange={[10, 0]}>
            <button
              ref={go}
              type="button"
              aria-label={words.enter}
              hidden
              onClick={() => {
                if (welcome.press(camera, page())) finish();
              }}
              onPointerDown={welcome.wake}
              onKeyDown={welcome.wake}
              onPointerEnter={() => welcome.hover(true)}
              onPointerLeave={() => welcome.hover(false)}
              onFocus={() => welcome.hover(true)}
              onBlur={() => welcome.hover(false)}
              className="block cursor-pointer rounded-full border-0 bg-transparent p-0 focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#f2bb59] focus-visible:outline-solid"
            />
            <p ref={say} role="status" className="sr-only" />
          </Html>
        </group>
      </primitive>
    </>
  );
}

export function Opening({
  intro,
  words,
  onShown,
  onDone,
}: {
  intro: RefObject<Intro>;
  words: OpeningWords;
  onShown: () => void;
  onDone: () => void;
}) {
  const scene = useThree((state) => state.scene);
  const setEvents = useThree((state) => state.setEvents);
  const paper = useRef<Mesh>(null);
  useLayoutEffect(() => {
    WAVE_UNIFORMS.waveR.value = 0;
    WAVE_UNIFORMS.waveLit.value = 1;
    setEvents({ enabled: false });
    return () => {
      waveDone(scene);
      setEvents({ enabled: true });
    };
  }, [scene, setEvents]);

  useFrame(() => {
    waveAll(scene);
    if (paper.current) paper.current.visible = !intro.current.arrived;
  }, -1);
  return (
    <>
      <mesh
        ref={paper}
        rotation-x={-Math.PI / 2}
        position-y={GROUND_Y - 0.03}
        userData={{ noWave: true }}
      >
        <planeGeometry args={[6000, 6000]} />
        <meshBasicMaterial color={PAPER} />
      </mesh>
      <Suspense fallback={null}>
        <Welcome intro={intro} words={words} onShown={onShown} onDone={onDone} />
      </Suspense>
    </>
  );
}

export function Arrived({ intro }: { intro: RefObject<Intro> }) {
  const get = useThree((state) => state.get);
  useEffect(() => {
    const { gl, scene, camera } = get();
    let gone = false;
    if (intro.current.on) waveAll(scene);
    gl.compileAsync(scene, camera)
      .catch(() => {})
      .then(() => {
        if (!gone) intro.current.arrived = true;
      });
    return () => {
      gone = true;
    };
  }, [get, intro]);
  return null;
}
