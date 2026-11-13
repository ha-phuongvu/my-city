"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { type Group, type Matrix4, type Mesh, type MeshStandardMaterial, PlaneGeometry } from "three";
import { useCityHit, useCityPoke } from "../motion/cityPointing";
import type { MotionProps } from "../motion/cycle";
import { type Canvas, drawWords, faceCanvas, faceMaterial, faceSheet } from "../motion/face";
import { FONTS } from "../motion/face.constants";
import { usePlayOnPoke, useStill } from "../motion/pointing";
import { useParts } from "../motion/useParts";
import { useRoomLight } from "../roomLight";
import {
  ACROSS,
  F,
  FLOW,
  FLOW_K,
  FLOW_MARGIN,
  FLOW_PLACE,
  FOOT,
  HEAD,
  HEAD_HALF,
  HEIGHT,
  HOP,
  INK,
  LIFT,
  NOTES,
  PAD,
  PAGE,
  PLAY,
  TUNE,
  U,
  UP,
  W,
  WIDTH,
} from "./MusicStand.constants";

// Music City's name sign: a wire music stand holding an open booklet of sheet music. On its pages,
// as the prototype's page lays them, the city's name is the piece's title over a staff with a
// treble clef and a little tune, with the status at the foot. Pointing at Music City (the stand is
// part of it) plays the tune once: the notes hop one after another (0.42 s each, 0.16 s apart) and
// the music flies out of the page, a ribbon of staff lines sweeping up out of the sheet in a wave,
// drawing itself out, notes popping onto it as it reaches them, then drifting up and fading; and
// pointing again does nothing until it's done (3 s).

/** How far the pages bow toward us X across from the spine */
const bow = (X: number) => 0.1 * Math.sin((Math.PI * Math.abs(X)) / (PAGE.width * 1.1)) + 0.01;

/** The point s across and t down the face, on the bowed pages */
function onPage(s: number, t: number): [number, number, number] {
  const X = -W / 2 + PAD + s * WIDTH;
  const up = PAGE.height - 0.06 - t * HEIGHT;
  const out = bow(X) + LIFT;
  return [0, 1, 2].map((i) => FOOT[i] + ACROSS[i] * X + UP[i] * up + F[i] * out) as [number, number, number];
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** A CSS cubic-bezier() timing curve: how far along it is at share x of the time */
function bezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const along = (a: number, b: number, s: number) =>
    3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const s = (lo + hi) / 2;
      if (along(x1, x2, s) < x) lo = s;
      else hi = s;
    }
    return along(y1, y2, (lo + hi) / 2);
  };
}
const EASE_IN_OUT = bezier(0.42, 0, 0.58, 1);
const EASE_OUT = bezier(0, 0, 0.58, 1);
const POP = bezier(0.3, 1.6, 0.6, 1);

const xc = (t: number) => 8 + 206 * t;
const yc = (t: number) => 104 - 80 * t + 13 * Math.sin(Math.PI * 2.4 * t);
const spread = (t: number) => 1.5 + 1.7 * Math.sin(Math.PI * Math.min(1, t * 1.12));
// each staff line: its points, and how far along it each one is
const STAFF = [-2, -1, 0, 1, 2].map((j) => {
  const points = Array.from(
    { length: 49 },
    (_, i) => [xc(i / 48), yc(i / 48) + j * spread(i / 48)] as const,
  );
  const along = [0];
  for (let i = 1; i < points.length; i++)
    along.push(
      along[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]),
    );
  return { points, along };
});
const noteAt = ([t, step]: readonly [number, number, number?]) =>
  [xc(t), yc(t) - (step * spread(t)) / 2, step >= 2] as const;

/** Over its 2.8 s the picture fades in, rises out of the sheet turning a little, and drifts up as it fades */
function flowAt(t: number) {
  const k = Math.min(1, Math.max(0, t / 2.8));
  const between = (keys: number[][], at: number) => {
    let i = 0;
    while (i < keys.length - 2 && at > keys[i + 1][0]) i++;
    const [a, b] = [keys[i], keys[i + 1]];
    const e = EASE_IN_OUT((at - a[0]) / (b[0] - a[0]));
    return a.slice(1).map((v, j) => v + (b[j + 1] - v) * e);
  };
  const [opacity] = between([[0, 0], [0.1, 1], [0.72, 1], [1, 0]], k);
  // [when, across and down (shares of the picture), turn (degrees, clockwise), scale]
  const [x, y, turn, scale] = between(
    [
      [0, -0.03, 0.05, 5, 0.9],
      [0.45, 0, -0.02, -1, 1],
      [1, 0.05, -0.15, -5, 1.04],
    ],
    k,
  );
  return { opacity, x: x * FLOW.width, y: -y * FLOW.height, turn: (-turn * Math.PI) / 180, scale };
}

/** The music flying out, t seconds into the tune: the staff drawing itself out and the notes popping on */
function paintFlow(canvas: Canvas, t: number) {
  const { context, k } = canvas;
  const at = (x: number, y: number) =>
    [(x + FLOW_MARGIN) * k, (y - FLOW.top + FLOW_MARGIN) * k] as const;
  context.clearRect(0, 0, canvas.width * k, canvas.height * k);
  context.save();
  context.strokeStyle = FLOW.ink;
  context.fillStyle = FLOW.ink;
  context.lineCap = "round";
  context.lineWidth = 0.55 * k;
  context.globalAlpha = 0.8;
  // the staff draws itself out over 1.25 s, from 0.1 s
  const drawn = EASE_OUT((t - 0.1) / 1.25);
  if (drawn > 0)
    for (const { points, along } of STAFF) {
      const end = drawn * along[along.length - 1];
      context.beginPath();
      context.moveTo(...at(points[0][0], points[0][1]));
      for (let i = 1; i < points.length; i++) {
        if (along[i] <= end) context.lineTo(...at(points[i][0], points[i][1]));
        else {
          const f = (end - along[i - 1]) / (along[i] - along[i - 1]);
          context.lineTo(
            ...at(
              points[i - 1][0] + (points[i][0] - points[i - 1][0]) * f,
              points[i - 1][1] + (points[i][1] - points[i - 1][1]) * f,
            ),
          );
          break;
        }
      }
      context.stroke();
    }
  context.lineCap = "butt";
  // each note pops on as the staff reaches it (0.45 s, from 0.12 s + 1.1 s × how far along it is):
  // from a fifth of its size, 3 down, overshooting a little, about the middle of its box
  const pop = (when: number, box: readonly number[], paint: () => void) => {
    const e = POP((t - (0.12 + when * 1.1)) / 0.45);
    if (e <= 0) return;
    const scale = 0.2 + 0.8 * e;
    const [cx, cy] = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
    context.save();
    context.globalAlpha = Math.min(1, e);
    context.translate(...at(cx, cy));
    context.scale(scale, scale);
    context.translate(0, 3 * (1 - e) * k);
    context.translate(-at(cx, cy)[0], -at(cx, cy)[1]);
    paint();
    context.restore();
  };
  NOTES.forEach((note, i) => {
    const [x, y, down] = noteAt(note);
    const sx = down ? x - 2.2 : x + 2.2;
    const sy = down ? y + 10 : y - 10;
    const next = note[2] && NOTES[i + 1] ? noteAt(NOTES[i + 1]) : undefined;
    const box = [
      Math.min(x - HEAD_HALF[0], sx, next ? next[0] + 2.2 : sx),
      Math.min(y - HEAD_HALF[1], sy, next ? next[1] - 10 : sy),
      Math.max(x + HEAD_HALF[0], sx, next ? next[0] + 2.2 : sx),
      Math.max(y + HEAD_HALF[1], sy, next ? next[1] - 10 : sy),
    ];
    pop(note[0], box, () => {
      context.beginPath();
      context.ellipse(...at(x, y), HEAD.rx * k, HEAD.ry * k, HEAD.turn, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 0.75 * k;
      context.beginPath();
      context.moveTo(...at(sx, y));
      context.lineTo(...at(sx, sy));
      context.stroke();
      if (next) {
        context.lineWidth = 2.2 * k;
        context.beginPath();
        context.moveTo(...at(sx, sy));
        context.lineTo(...at(next[0] + 2.2, next[1] - 10));
        context.stroke();
      }
    });
  });
  // and the treble clef at its start
  const [clefX, clefY] = [xc(0.035) - 4, yc(0.035) + 6];
  context.font = `${18 * k}px ${FONTS.music}`;
  context.textBaseline = "alphabetic";
  const clef = context.measureText("\u{1D11E}");
  const clefBox = [
    clefX - clef.actualBoundingBoxLeft / k,
    clefY - clef.actualBoundingBoxAscent / k,
    clefX + clef.actualBoundingBoxRight / k,
    clefY + clef.actualBoundingBoxDescent / k,
  ];
  pop(0.02, clefBox, () => context.fillText("\u{1D11E}", ...at(clefX, clefY)));
  context.restore();
  canvas.texture.needsUpdate = true;
}

/** How far note i has hopped up (0 to 1) t seconds into the tune: up quickly, then back down */
function hop(i: number, t: number): number {
  const k = (t - i * HOP.gap) / HOP.time;
  if (k <= 0 || k >= 1) return 0;
  return k < 0.4 ? easeOut(k / 0.4) : 1 - easeOut((k - 0.4) / 0.6);
}

/** The pages' words and music, the notes hopped up as far as they are t seconds into the tune */
function paintPages(face: Canvas, name: string, sub: string, t: number | undefined) {
  const { context, k } = face;
  context.clearRect(0, 0, WIDTH * k, HEIGHT * k);
  const gap = 0.04 * U;
  const title = { text: name, size: 0.19 * U, font: FONTS.display, weight: 700, spacing: 0.01, color: INK };
  const status = { text: sub, size: 0.11 * U, font: FONTS.script, weight: 600, color: INK, opacity: 0.85 };
  let y = 0.04 * U;
  drawWords(face, title, WIDTH / 2, y + title.size / 2);
  y += title.size + gap;
  // the staff: 94% of the page's width, 100 × 30 of its own units
  const width = 0.94 * WIDTH;
  const unit = width / 100;
  const left = (WIDTH - width) / 2;
  const at = (sx: number, sy: number) => [(left + sx * unit) * k, (y + sy * unit) * k] as const;
  context.save();
  context.strokeStyle = INK;
  context.fillStyle = INK;
  context.globalAlpha = 0.75;
  context.lineWidth = 0.35 * unit * k;
  for (const line of [9, 12, 15, 18, 21]) {
    context.beginPath();
    context.moveTo(...at(2, line));
    context.lineTo(...at(98, line));
    context.stroke();
  }
  context.globalAlpha = 1;
  context.font = `${25 * unit * k}px ${FONTS.music}`;
  context.textBaseline = "alphabetic";
  context.fillText("\u{1D11E}", ...at(3, 23));
  context.lineWidth = 0.55 * unit * k;
  TUNE.forEach(([nx, ny], i) => {
    // a hopping note rises 3.5 and grows a little, from its foot
    const h = t === undefined ? 0 : hop(i, t);
    const up = ny > 15;
    const foot = up ? ny + 1.9 : ny + 11;
    const scale = 1 + HOP.grow * h;
    context.save();
    context.translate(...at(nx, foot - HOP.height * h));
    context.scale(scale, scale);
    const [fx, fy] = at(nx, foot);
    context.translate(-fx, -fy);
    context.beginPath();
    context.ellipse(...at(nx, ny), 2.6 * unit * k, 1.9 * unit * k, (-22 * Math.PI) / 180, 0, Math.PI * 2);
    context.fill();
    const stem = up ? 2.3 : -2.3;
    context.beginPath();
    context.moveTo(...at(nx + stem, ny));
    context.lineTo(...at(nx + stem, ny + (up ? -11 : 11)));
    context.stroke();
    context.restore();
  });
  context.restore();
  y += 30 * unit + gap;
  drawWords(face, status, WIDTH / 2, y + status.size / 2);
  face.texture.needsUpdate = true;
}

type Props = MotionProps & {
  /** where it stands: the prototype's units on its card → the map */
  place: Matrix4;
  name: string;
  sub: string;
};

/** Music City's music stand, playing its little tune when the city is pointed at */
export function MusicStand({ place, name, sub, ...motion }: Props) {
  const { model, toModel } = useParts("/models/music-stand.glb");
  const light = useRoomLight();
  const still = useStill();
  const hit = useCityHit("music");
  const city = useCityPoke("music");
  const play = usePlayOnPoke(PLAY, { ...motion, poke: (motion.poke ?? 0) + city });
  const fromModel = useMemo(() => toModel.clone().invert(), [toModel]);
  const face = useMemo(() => faceCanvas(WIDTH, HEIGHT, 360), []);
  const sheet = useMemo(() => faceSheet(onPage, 24, 1), []);
  const look = useMemo(() => faceMaterial(face.texture, light), [face, light]);
  const flowCanvas = useMemo(
    () => faceCanvas(FLOW.width + 2 * FLOW_MARGIN, FLOW.height + 2 * FLOW_MARGIN, FLOW_K),
    [],
  );
  const flowSheet = useMemo(
    () =>
      new PlaneGeometry(FLOW.width + 2 * FLOW_MARGIN, FLOW.height + 2 * FLOW_MARGIN).translate(
        FLOW.width / 2,
        FLOW.height / 2,
        0,
      ),
    [],
  );
  const flowLook = useMemo(
    () => faceMaterial(flowCanvas.texture, light) as MeshStandardMaterial,
    [flowCanvas, light],
  );
  const flow = useRef<Group>(null);
  const flowMesh = useRef<Mesh>(null);
  const drawn = useRef<number | undefined | null>(null);
  // drawn again at rest whenever the words change
  useEffect(() => {
    drawn.current = null;
  }, [face, name, sub]);
  useEffect(
    () => () => {
      sheet.dispose();
      look.dispose();
      face.texture.dispose();
      flowSheet.dispose();
      flowLook.dispose();
      flowCanvas.texture.dispose();
    },
    [sheet, look, face, flowSheet, flowLook, flowCanvas],
  );

  useFrame(() => {
    const t = still ? undefined : play();
    // the pages are drawn again only while the notes are hopping
    if (t !== undefined || drawn.current !== undefined) {
      paintPages(face, name, sub, t);
      drawn.current = t;
    }
    // the music flying out of the page, while it plays
    const shown = t !== undefined && t < 2.8;
    if (flowMesh.current) flowMesh.current.visible = shown;
    if (!shown || !flow.current) return;
    paintFlow(flowCanvas, t);
    const { opacity, x, y, turn, scale } = flowAt(t);
    (flowMesh.current?.material as MeshStandardMaterial).opacity = opacity;
    flow.current.position.set(x, y, 0);
    flow.current.rotation.z = turn;
    flow.current.scale.setScalar(scale);
  });

  return (
    <group matrixAutoUpdate={false} matrix={place} {...hit}>
      <group matrixAutoUpdate={false} matrix={fromModel}>
        <primitive object={model} />
      </group>
      <mesh geometry={sheet} material={look} />
      <group matrixAutoUpdate={false} matrix={FLOW_PLACE}>
        <group ref={flow}>
          <mesh
            ref={flowMesh}
            geometry={flowSheet}
            material={flowLook}
            visible={false}
            raycast={() => null}
          />
        </group>
      </group>
    </group>
  );
}
