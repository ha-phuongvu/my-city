"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Matrix4, Vector3 } from "three";
import type { MotionProps } from "../motion/cycle";
import { type Canvas, drawWords, faceCanvas, faceMaterial, faceSheet, type Words, wordsWidth } from "../motion/face";
import { FONTS } from "../motion/face.constants";
import { useCityHit, useCityPoke } from "../motion/cityPointing";
import { usePlayOnPoke, useStill } from "../motion/pointing";
import { moveInPrototype } from "../motion/prototype";
import { useParts } from "../motion/useParts";
import { useRoomLight } from "../roomLight";
import { ACROSS, F, H, HEIGHT, INK, LIFT, NIB, ORIGIN, PAD, ROLL, U, W, WIDTH, WRITE } from "./Scroll.constants";

// Story City's name sign: a scroll of paper standing on the grass, a quill lying across it with its
// nib on the writing, and the inkwell on the grass beside it. The city's name is written on the
// paper in dark-blue ink, as the prototype's page lays it there. Pointing at Story City (the scroll,
// its lawn or its book) makes the words vanish and the quill write them again, line by line: the
// nib lifts and moves to the start of a line, runs along it with a little up and down as
// handwriting does while the line appears behind it, and when all are written the quill goes back
// to rest (writeScroll). Pointing again does nothing until it has finished.

/** The sheet's middle line k of the way up, and how far it curves toward us X across (scrollSign's prof and bend) */
const profile = (k: number) => [
  0.07 * (W / 1.7) * Math.sin(Math.PI * 2 * k + 0.4),
  0.02 - 0.14 * k + 0.07 * Math.sin(Math.PI * 2 * k),
  ROLL.bottom * 1.5 + (H - ROLL.top - ROLL.bottom * 1.5) * k,
];
const bend = (X: number) => 0.13 * ((2 * X) / W) ** 2;

/** The point s across and t down the words' face, on the curving sheet, `out` in front of it */
function onSheet(s: number, t: number, out = LIFT): [number, number, number] {
  const X = -W / 2 + PAD + s * WIDTH;
  const [px, py, pz] = profile(0.9 - 0.8 * t);
  const across = px + X;
  const forward = py + bend(X) + out;
  return [ORIGIN[0] + ACROSS[0] * across + F[0] * forward, ORIGIN[1] + ACROSS[1] * across + F[1] * forward, ORIGIN[2] + pz];
}

type Line = { words?: Words; width: number; height: number; top: number; write: number; along: number };

function layout(face: Canvas, name: string, sub: string): Line[] {
  const [first, ...more] = name.split(" ");
  const big: Words = { text: first, size: 0.5 * U, font: FONTS.script, weight: 700, color: INK, glow: { color: "rgba(38, 48, 79, 0.45)", blur: 0.008 * U } };
  const second: Words = { ...big, text: more.join(" "), size: 0.4 * U };
  const status: Words = { ...big, text: sub, size: 0.2 * U, weight: 600 };
  const lines: Omit<Line, "top">[] = [
    { words: big, width: wordsWidth(face, big), height: big.size, write: WRITE.name, along: 0.72 },
    ...(more.length ? [{ words: second, width: wordsWidth(face, second), height: second.size, write: WRITE.rest, along: 0.72 }] : []),
    { width: 0.64 * WIDTH, height: 0.07 * U, write: WRITE.flourish, along: 0.6 },
    { words: status, width: wordsWidth(face, status), height: status.size, write: WRITE.status, along: 0.72 },
  ];
  // the second word tucks up 0.06 under the first; the flourish has 0.02 above it and 0.06 below
  const before = (i: number) => (lines[i].words === second ? -0.06 * U : !lines[i].words ? 0.02 * U : 0);
  const after = (i: number) => (!lines[i].words ? 0.06 * U : 0);
  const total = lines.reduce((sum, line, i) => sum + before(i) + line.height + after(i), 0);
  let y = (HEIGHT - total) / 2;
  return lines.map((line, i) => {
    y += before(i);
    const placed = { ...line, top: y };
    y += line.height + after(i);
    return placed;
  });
}

/** The words, each line shown as far as `shown` (0 to 1 across it) */
function paintWords(face: Canvas, lines: Line[], shown: number[]) {
  const { context, k } = face;
  context.clearRect(0, 0, WIDTH * k, HEIGHT * k);
  lines.forEach((line, i) => {
    if (shown[i] <= 0) return;
    const left = (WIDTH - line.width) / 2;
    context.save();
    context.beginPath();
    context.rect((left - 0.3 * line.height) * k, (line.top - 0.3 * line.height) * k, (line.width * shown[i] + 0.3 * line.height) * k, line.height * 1.6 * k);
    context.clip();
    if (line.words) drawWords(face, line.words, WIDTH / 2, line.top + line.height / 2);
    else {
      // the flourish: the box's bottom edge, curving down from its top left to its foot and up to the
      // right, tipped 3 degrees (border-radius 0 0 60% 40% / 0 0 100% 70%)
      context.translate((left + line.width / 2) * k, (line.top + line.height / 2) * k);
      context.rotate((-3 * Math.PI) / 180);
      const w = line.width * k;
      const h = line.height * k;
      context.strokeStyle = INK;
      context.globalAlpha = 0.85;
      context.lineWidth = 0.022 * U * k;
      context.lineCap = "round";
      context.beginPath();
      context.ellipse(-w / 2 + 0.6 * w, -h / 2, 0.6 * w, h, 0, Math.PI, Math.PI / 2, true);
      context.ellipse(w / 2 - 0.4 * w, h / 2 - 0.7 * h, 0.4 * w, 0.7 * h, 0, Math.PI / 2, 0, true);
      context.stroke();
    }
    context.restore();
  });
  face.texture.needsUpdate = true;
}

type Key = { time: number; at: Vector3 };

/**
 * The quill's path while it writes: where the nib is at each moment (prototype units, on the card),
 * and when each line starts to appear. Between lines it lifts: up the page by half the line's
 * height, and off the paper a little.
 */
function path(lines: Line[]) {
  const keys: Key[] = [{ time: 0, at: NIB.clone() }];
  const starts: number[] = [];
  const down = new Vector3(...onSheet(0, 1)).sub(new Vector3(...onSheet(0, 0))).normalize();
  const out = new Vector3(F[0], F[1], 0);
  let time = 0;
  let pen = NIB.clone();
  const point = (x: number, y: number, rise = 0) => new Vector3(...onSheet(x / WIDTH, y / HEIGHT, LIFT + 0.004 + rise));
  const move = (to: Vector3, seconds: number, lift: number) => {
    const mid = pen.clone().add(to).multiplyScalar(0.5).addScaledVector(down, -lift).addScaledVector(out, lift * 0.4);
    keys.push({ time: time + seconds / 2, at: mid }, { time: time + seconds, at: to });
    time += seconds;
    pen = to;
  };
  for (const line of lines) {
    const left = (WIDTH - line.width) / 2;
    const y = line.top + line.height * line.along;
    const lift = line.height * 0.5;
    move(point(left + 0.03 * line.width, y), WRITE.reach, lift);
    starts.push(time);
    // six steps along the line, the nib bobbing a little up and down
    for (let step = 1; step <= 6; step++) {
      const x = left + (0.03 + (0.94 * step) / 6) * line.width;
      keys.push({ time: time + (line.write * step) / 6, at: point(x, y + (step % 2 ? -1 : 1) * lift * 0.12) });
    }
    time += line.write;
    pen = keys[keys.length - 1].at;
  }
  move(NIB.clone(), WRITE.back, lines[lines.length - 1].height * 0.3);
  return { keys, starts, length: time };
}

type Props = MotionProps & {
  /** where the scroll stands: the prototype's units on its card → the map */
  place: Matrix4;
  /** where the inkwell stands, the same way (on the map it sits a little apart from the scroll) */
  inkPlace?: Matrix4;
  name: string;
  sub: string;
};

/** Story City's scroll, its quill writing the name again when the city is pointed at */
export function Scroll({ place, inkPlace, name, sub, ...motion }: Props) {
  const { model, part, toModel } = useParts("/models/scroll.glb");
  const light = useRoomLight();
  const still = useStill();
  const city = useCityPoke("story");
  const hit = useCityHit("story");
  const fromModel = useMemo(() => toModel.clone().invert(), [toModel]);
  const face = useMemo(() => faceCanvas(WIDTH, HEIGHT, 360), []);
  const lines = useMemo(() => layout(face, name, sub), [face, name, sub]);
  const writing = useMemo(() => path(lines), [lines]);
  const play = usePlayOnPoke(writing.length, { ...motion, poke: (motion.poke ?? 0) + city });
  const sheet = useMemo(() => faceSheet(onSheet, 16, 12), []);
  const look = useMemo(() => faceMaterial(face.texture, light), [face, light]);
  const drawn = useRef<string>("");
  useEffect(
    () => () => {
      sheet.dispose();
      look.dispose();
      face.texture.dispose();
    },
    [sheet, look, face],
  );
  // on the map the inkwell stands apart from the scroll: carried from where the scroll's placing
  // puts it to where its own does
  useEffect(() => {
    const ink = part("inkwell");
    if (!ink || !inkPlace) return;
    const apart = new Matrix4().copy(place).invert().multiply(inkPlace);
    moveInPrototype(ink, toModel, apart);
  }, [part, place, inkPlace, toModel]);

  useFrame(() => {
    const t = still ? undefined : play();
    // each line hidden until the nib reaches it, then shown as far as the nib has run along it
    const shown = lines.map((line, i) => (t === undefined ? 1 : Math.min(1, Math.max(0, (t - writing.starts[i]) / line.write))));
    const key = shown.map((s) => s.toFixed(3)).join();
    if (key !== drawn.current) {
      paintWords(face, lines, shown);
      drawn.current = key;
    }
    const quill = part("quill");
    if (!quill) return;
    const nib = NIB.clone();
    if (t !== undefined) {
      const { keys } = writing;
      const next = keys.findIndex((k) => k.time >= t);
      if (next > 0) {
        const a = keys[next - 1];
        const b = keys[next];
        nib.lerpVectors(a.at, b.at, (t - a.time) / Math.max(1e-6, b.time - a.time));
      }
    }
    const shift = nib.sub(NIB);
    moveInPrototype(quill, toModel, new Matrix4().makeTranslation(shift.x, shift.y, shift.z));
  });

  return (
    <group matrixAutoUpdate={false} matrix={place} {...hit}>
      <group matrixAutoUpdate={false} matrix={fromModel}>
        <primitive object={model} />
      </group>
      <mesh geometry={sheet} material={look} />
    </group>
  );
}
