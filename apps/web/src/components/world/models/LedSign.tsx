"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { type Matrix4 } from "three";
import { useCityHit, useInCity } from "../utils/cityPointing";
import type { MotionProps } from "../utils/cycle";
import { type Canvas, drawWords, faceCanvas, faceMaterial, flatSheet, type Words, wordsWidth } from "../utils/face";
import { FONTS } from "../constants/face.constants";
import { useStill } from "../utils/pointing";
import { useParts } from "../utils/useParts";
import {
  DOT,
  FACE,
  HEIGHT,
  LIFT,
  LIT,
  NAME,
  OUT,
  PIXELS,
  RUN,
  SCREEN,
  SPOT,
  STILL_FILL,
  STRIP_TOP,
  SUB_BOTTOM,
  UNLIT,
  WIDTH,
} from "../constants/LedSign.constants";

// Game City's name sign: a black LED board standing on the grass, the name in amber dots and the
// city's status in small green letters under it. As on the prototype's page, at rest the name stands
// still in the middle of the board; while the pointer is in Game City it runs left to right across
// it (led-run: the words twice over on a strip that slides one copy's width every 5 s), and once
// the pointer leaves it finishes the pass it is on and stands still again. The words are drawn sharp
// and seen through a grid of round dots, as the page masks them, so a dot half on a letter shows that
// half; the running dots are the strip's own (its mask moves with it) over the board's fixed grid of
// faint unlit dots.

type Lit = { image: HTMLCanvasElement; copy: number; k: number };

const nameWords = (name: string): Words => ({ text: name.toUpperCase(), font: FONTS.body, ...NAME });

/** The strip of lit dots for the running name: the name and its red dot, twice over */
function strip(name: string): Lit {
  const words = nameWords(name);
  const fine = PIXELS;
  const measure = faceCanvas(1, 1, fine);
  const copy = wordsWidth(measure, words) + SPOT.margin * 2 + SPOT.size;
  measure.texture.dispose();
  // the strip's words drawn sharp, to be seen through its dots
  const ink = faceCanvas(copy * 2, words.size, fine);
  const pen = ink.context;
  for (const start of [0, copy]) {
    drawWords(ink, words, start, words.size / 2, "left");
    const spotX = start + wordsWidth(ink, words) + SPOT.margin + SPOT.size / 2;
    pen.fillStyle = SPOT.color;
    pen.beginPath();
    pen.arc(spotX * fine, (words.size / 2) * fine, (SPOT.size / 2) * fine, 0, Math.PI * 2);
    pen.fill();
  }
  return { image: lightUp(ink), copy, k: fine };
}

/** The name standing still in the middle of the board, in lit dots on the board's own grid (with no red dot) */
function standing(name: string): Lit {
  const words = nameWords(name);
  const fine = PIXELS;
  const ink = faceCanvas(WIDTH, words.size, fine);
  const wide = wordsWidth(ink, words);
  if (wide > WIDTH * STILL_FILL) words.size *= (WIDTH * STILL_FILL) / wide;
  drawWords(ink, words, WIDTH / 2, NAME.size / 2);
  return { image: lightUp(ink), copy: WIDTH, k: fine };
}

/**
 * Words drawn sharp on `ink`, seen through a grid of dots starting at its top left as the page masks
 * them: each dot shows the part of the words that falls in it, in their colour, and the dots glow
 */
function lightUp(ink: Canvas): HTMLCanvasElement {
  const { width, height } = ink.context.canvas;
  const cell = DOT * ink.k;
  const lit = document.createElement("canvas");
  const image = document.createElement("canvas");
  const dot = document.createElement("canvas");
  lit.width = image.width = width;
  lit.height = image.height = height;
  dot.width = dot.height = Math.ceil(cell);
  const mask = lit.getContext("2d");
  const paint = image.getContext("2d");
  const stamp = dot.getContext("2d");
  if (!mask || !paint || !stamp) return image;
  // one dot, solid to `inner` of the way from its middle to its cell's corner and gone by `outer`
  const edge = stamp.createRadialGradient(cell / 2, cell / 2, 0, cell / 2, cell / 2, LIT.outer * cell * Math.SQRT1_2);
  edge.addColorStop(0, "#000");
  edge.addColorStop(LIT.inner / LIT.outer, "#000");
  edge.addColorStop(1, "rgba(0, 0, 0, 0)");
  stamp.fillStyle = edge;
  stamp.fillRect(0, 0, dot.width, dot.height);
  for (let i = 0; i * cell < width; i++) for (let j = 0; j * cell < height; j++) mask.drawImage(dot, i * cell, j * cell);
  // the words, only where the dots are
  mask.globalCompositeOperation = "source-in";
  mask.drawImage(ink.context.canvas, 0, 0);
  ink.texture.dispose();
  // glowing
  paint.shadowColor = LIT.glow;
  paint.shadowBlur = LIT.blur * ink.k;
  paint.drawImage(lit, 0, 0);
  return image;
}

/** The board's still parts: the screen, its grid of unlit dots and the status line */
function board(sub: string, face: Canvas) {
  const { context, k } = face;
  context.fillStyle = SCREEN;
  context.fillRect(0, 0, WIDTH * k, HEIGHT * k);
  context.fillStyle = UNLIT.color;
  for (let i = 0; (i + 0.5) * DOT < WIDTH; i++) {
    for (let j = 0; (j + 0.5) * DOT < HEIGHT; j++) {
      context.beginPath();
      context.arc((i + 0.5) * DOT * k, (j + 0.5) * DOT * k, UNLIT.radius * k, 0, Math.PI * 2);
      context.fill();
    }
  }
  drawWords(
    face,
    { text: sub.toUpperCase(), size: 0.13, font: FONTS.body, weight: 800, spacing: 0.18, color: "#7fe08a", opacity: 0.9 },
    WIDTH / 2,
    HEIGHT - SUB_BOTTOM - 0.13 / 2,
  );
}

/** The board with the lit dots slid `along` of the way (0 to 1) from one copy's width left of its edge */
function paintRun(face: Canvas, back: Canvas, run: Lit, along: number) {
  const { context, k } = face;
  context.drawImage(back.context.canvas, 0, 0);
  context.save();
  context.beginPath();
  context.rect(0, 0, WIDTH * k, HEIGHT * k);
  context.clip();
  const x = -run.copy + run.copy * along;
  context.drawImage(run.image, x * k, STRIP_TOP * k, (run.image.width / run.k) * k, (run.image.height / run.k) * k);
  context.restore();
  face.texture.needsUpdate = true;
}

type Props = MotionProps & {
  /** where it stands: the prototype's units on its card → the map */
  place: Matrix4;
  name: string;
  sub: string;
};

/** Game City's LED board, its name running across it while the pointer is in the city */
export function LedSign({ place, name, sub, speed = 1, at }: Props) {
  const { model, toModel } = useParts("/models/led-sign.glb");
  const still = useStill();
  const inCity = useInCity("game");
  const hit = useCityHit("game");
  const fromModel = useMemo(() => toModel.clone().invert(), [toModel]);
  // how far into the pass it's running, or undefined while the name stands still, and what's painted
  // (nothing yet, so the first frame always paints)
  const time = useRef<number | undefined>(undefined);
  const painted = useRef(Number.NaN);
  const face = useMemo(() => faceCanvas(WIDTH, HEIGHT, PIXELS), []);
  const back = useMemo(() => {
    const plain = faceCanvas(WIDTH, HEIGHT, face.k);
    board(sub, plain);
    return plain;
  }, [sub, face.k]);
  const run = useMemo(() => strip(name), [name]);
  const rest = useMemo(() => standing(name), [name]);
  const sheet = useMemo(() => flatSheet(FACE, OUT, LIFT), []);
  const look = useMemo(() => faceMaterial(face.texture), [face]);
  useEffect(
    () => () => {
      sheet.dispose();
      look.dispose();
      face.texture.dispose();
      back.texture.dispose();
    },
    [sheet, look, face, back],
  );

  useFrame((_, delta) => {
    // the strip slides from one copy's width left of the board's edge to the edge, then again for as
    // long as the pointer stays in the city; at the end of a pass with the pointer gone it stops
    // (with less motion it never starts)
    if (inCity && !still && time.current === undefined) time.current = 0;
    if (time.current !== undefined) {
      time.current += delta * speed;
      if (time.current >= RUN) time.current = inCity ? time.current % RUN : undefined;
    }
    const along = at ?? (time.current === undefined ? -1 : time.current / RUN);
    if (along === painted.current) return;
    painted.current = along;
    if (along < 0) paintRun(face, back, rest, 1);
    else paintRun(face, back, run, along);
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
