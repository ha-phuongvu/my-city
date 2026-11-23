"use client";

import { TextAlign } from "../../constants/face.constants";
import { CityId } from "../../constants/layout.constants";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { type Matrix4 } from "three";
import { useCityHit, useInCity } from "../../utils/cityPointing";
import type { MotionProps } from "../../utils/cycle";
import {
  type Canvas,
  drawWords,
  faceCanvas,
  faceMaterial,
  flatSheet,
  type Words,
  wordsWidth,
} from "../../utils/face";
import { FONTS } from "../../constants/face.constants";
import { useStill } from "../../utils/pointing";
import { useParts } from "../../utils/useParts";
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
} from "../../constants/cities/game/LedSign.constants";

type Lit = { image: HTMLCanvasElement; copy: number; k: number };

const nameWords = (name: string): Words => ({
  text: name.toUpperCase(),
  font: FONTS.body,
  ...NAME,
});

function strip(name: string): Lit {
  const words = nameWords(name);
  const fine = PIXELS;
  const measure = faceCanvas(1, 1, fine);
  const copy = wordsWidth(measure, words) + SPOT.margin * 2 + SPOT.size;
  measure.texture.dispose();

  const ink = faceCanvas(copy * 2, words.size, fine);
  const pen = ink.context;
  for (const start of [0, copy]) {
    drawWords(ink, words, start, words.size / 2, TextAlign.Left);
    const spotX = start + wordsWidth(ink, words) + SPOT.margin + SPOT.size / 2;
    pen.fillStyle = SPOT.color;
    pen.beginPath();
    pen.arc(spotX * fine, (words.size / 2) * fine, (SPOT.size / 2) * fine, 0, Math.PI * 2);
    pen.fill();
  }
  return { image: lightUp(ink), copy, k: fine };
}

function standing(name: string): Lit {
  const words = nameWords(name);
  const fine = PIXELS;
  const ink = faceCanvas(WIDTH, words.size, fine);
  const wide = wordsWidth(ink, words);
  if (wide > WIDTH * STILL_FILL) words.size *= (WIDTH * STILL_FILL) / wide;
  drawWords(ink, words, WIDTH / 2, NAME.size / 2);
  return { image: lightUp(ink), copy: WIDTH, k: fine };
}

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

  const edge = stamp.createRadialGradient(
    cell / 2,
    cell / 2,
    0,
    cell / 2,
    cell / 2,
    LIT.outer * cell * Math.SQRT1_2,
  );
  edge.addColorStop(0, "#000");
  edge.addColorStop(LIT.inner / LIT.outer, "#000");
  edge.addColorStop(1, "rgba(0, 0, 0, 0)");
  stamp.fillStyle = edge;
  stamp.fillRect(0, 0, dot.width, dot.height);
  for (let i = 0; i * cell < width; i++)
    for (let j = 0; j * cell < height; j++) mask.drawImage(dot, i * cell, j * cell);

  mask.globalCompositeOperation = "source-in";
  mask.drawImage(ink.context.canvas, 0, 0);
  ink.texture.dispose();

  paint.shadowColor = LIT.glow;
  paint.shadowBlur = LIT.blur * ink.k;
  paint.drawImage(lit, 0, 0);
  return image;
}

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
    {
      text: sub.toUpperCase(),
      size: 0.13,
      font: FONTS.body,
      weight: 800,
      spacing: 0.18,
      color: "#7fe08a",
      opacity: 0.9,
    },
    WIDTH / 2,
    HEIGHT - SUB_BOTTOM - 0.13 / 2,
  );
}

function paintRun(face: Canvas, back: Canvas, run: Lit, along: number) {
  const { context, k } = face;
  context.drawImage(back.context.canvas, 0, 0);
  context.save();
  context.beginPath();
  context.rect(0, 0, WIDTH * k, HEIGHT * k);
  context.clip();
  const x = -run.copy + run.copy * along;
  context.drawImage(
    run.image,
    x * k,
    STRIP_TOP * k,
    (run.image.width / run.k) * k,
    (run.image.height / run.k) * k,
  );
  context.restore();
  face.texture.needsUpdate = true;
}

type Props = MotionProps & {
  place: Matrix4;
  name: string;
  sub: string;
};

export function LedSign({ place, name, sub, speed = 1, at }: Props) {
  const { model, toModel } = useParts("/models/led-sign.glb");
  const still = useStill();
  const inCity = useInCity(CityId.Game);
  const hit = useCityHit(CityId.Game);
  const fromModel = useMemo(() => toModel.clone().invert(), [toModel]);

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
