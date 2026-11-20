"use client";

import { useEffect, useMemo } from "react";
import type { Matrix4, Mesh, MeshStandardMaterial } from "three";
import { drawWords, faceCanvas, faceMaterial, flatSheet } from "../utils/face";
import { FONTS } from "../constants/face.constants";
import { useParts } from "../utils/useParts";
import { useRoomLight } from "../utils/roomLight";
import { CREAM, FACE, FADE, FADED, HEIGHT, LIFT, OUT, SHADOW, U, WIDTH } from "../constants/NameSign.constants";

// A city's wooden A-frame name sign (Movie City's). Its name is painted on the front board in cream,
// as the prototype's page lays it there: the first word big, the rest under it in capitals, a thin
// rule and the city's status. A city that opens later has its sign a little faded, as on the map.

function paintBoard(name: string, sub: string, later: boolean) {
  const face = faceCanvas(WIDTH, HEIGHT, 400);
  const color = later ? CREAM.later : CREAM.open;
  const [first, ...more] = name.split(" ");
  const big = { text: first, size: 0.36 * U, font: FONTS.display, weight: 700, spacing: 0.02, color, glow: SHADOW };
  const rest = { text: more.join(" ").toUpperCase(), size: 0.26 * U, font: FONTS.display, weight: 600, spacing: 0.08, color, glow: SHADOW };
  const status = { text: sub, size: 0.13 * U, font: FONTS.body, weight: 600, spacing: 0.04, color, opacity: 0.92, glow: SHADOW };
  const gap = 0.04 * U;
  const rule = { width: 0.7 * WIDTH, height: 0.018 * U, above: 0.07 * U, below: 0.04 * U };
  const total = big.size + gap + rest.size + gap + rule.above + rule.height + rule.below + gap + status.size;
  let y = (HEIGHT - total) / 2;
  drawWords(face, big, WIDTH / 2, y + big.size / 2);
  y += big.size + gap;
  drawWords(face, rest, WIDTH / 2, y + rest.size / 2);
  y += rest.size + gap + rule.above;
  const { context, k } = face;
  context.globalAlpha = 0.8;
  context.fillStyle = color;
  context.fillRect(((WIDTH - rule.width) / 2) * k, y * k, rule.width * k, rule.height * k);
  context.globalAlpha = 1;
  y += rule.height + rule.below + gap;
  drawWords(face, status, WIDTH / 2, y + status.size / 2);
  face.texture.needsUpdate = true;
  return face;
}

type Props = {
  /** where it stands: the prototype's units on its card → the map */
  place: Matrix4;
  name: string;
  sub: string;
  /** a city that opens later: its sign a little faded */
  later?: boolean;
};

/** A city's wooden A-frame sign with its name painted on */
export function NameSign({ place, name, sub, later = false }: Props) {
  const { model, toModel } = useParts("/models/name-sign.glb");
  const light = useRoomLight();
  const fromModel = useMemo(() => toModel.clone().invert(), [toModel]);
  const face = useMemo(() => paintBoard(name, sub, later), [name, sub, later]);
  const sheet = useMemo(() => flatSheet(FACE, OUT, LIFT), []);
  const look = useMemo(() => faceMaterial(face.texture, light), [face, light]);
  useEffect(() => {
    if (!later) return;
    model.traverse((object) => {
      const material = (object as Mesh).material as MeshStandardMaterial | undefined;
      // (once: this copy's materials are its own)
      if (!material?.color || material.userData.faded) return;
      material.color.convertLinearToSRGB().lerp(FADE, FADED).convertSRGBToLinear();
      material.userData.faded = true;
    });
  }, [model, later]);
  useEffect(
    () => () => {
      sheet.dispose();
      look.dispose();
      face.texture.dispose();
    },
    [sheet, look, face],
  );

  return (
    <group matrixAutoUpdate={false} matrix={place}>
      <group matrixAutoUpdate={false} matrix={fromModel}>
        <primitive object={model} />
      </group>
      <mesh geometry={sheet} material={look} />
    </group>
  );
}
