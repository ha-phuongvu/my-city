"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  type Matrix4,
  MeshStandardMaterial,
  SphereGeometry,
  SpriteMaterial,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { MotionProps } from "../../utils/cycle";
import { drawWords, faceCanvas, faceMaterial, flatSheet } from "../../utils/face";
import { FONTS } from "../../constants/face.constants";
import { usePlayWhilePointed, usePointer, useStill } from "../../utils/pointing";
import { useParts } from "../../utils/useParts";
import { useRoomLight, withRoomLight } from "../../utils/roomLight";
import {
  BLINK,
  FACE,
  GLOW,
  HEIGHT,
  INK,
  LAG,
  LAMP,
  LIFT,
  OFF,
  ON,
  OUT,
  U,
  WIDTH,
  YELLOW,
} from "../../constants/cities/future/Barricade.constants";

// The future-city plot's construction barricade. Its yellow board carries the plot's name in
// stencilled letters over hazard stripes, as the prototype's page lays them on it, and two warning
// lamps stand on top. Pointing at it blinks the lamps (lamp-blink): each lights for a quarter of a
// second and goes out for a quarter, the right one a quarter of a second behind the left, so they
// take turns, for as long as the pointer stays on it.

/** The board's face: the name and status in stencil letters, hazard stripes along its foot */
function paintBoard(name: string, sub: string) {
  const face = faceCanvas(WIDTH, HEIGHT, 360);
  const { context, k } = face;
  context.fillStyle = YELLOW;
  context.fillRect(0, 0, WIDTH * k, HEIGHT * k);
  // hazard stripes on the bottom 22%, a dark line along their top
  const band = 0.22 * HEIGHT;
  context.save();
  context.beginPath();
  context.rect(0, (HEIGHT - band) * k, WIDTH * k, band * k);
  context.clip();
  context.fillStyle = INK;
  const step = 0.1 * U;
  for (let x = -band; x < WIDTH + band; x += step) {
    context.beginPath();
    context.moveTo(x * k, HEIGHT * k);
    context.lineTo((x + step / 2) * k, HEIGHT * k);
    context.lineTo((x + step / 2 + band) * k, (HEIGHT - band) * k);
    context.lineTo((x + band) * k, (HEIGHT - band) * k);
    context.fill();
  }
  context.restore();
  context.fillStyle = INK;
  context.fillRect(0, (HEIGHT - band) * k, WIDTH * k, 0.012 * U * k);
  // the frame
  context.strokeStyle = INK;
  context.lineWidth = 0.016 * U * k;
  context.strokeRect(
    0.008 * U * k,
    0.008 * U * k,
    (WIDTH - 0.016 * U) * k,
    (HEIGHT - 0.016 * U) * k,
  );
  // the words, from the top
  const title = {
    text: name.toUpperCase(),
    size: 0.15 * U,
    font: FONTS.stencil,
    weight: 700,
    spacing: 0.04,
    color: INK,
  };
  const status = {
    text: sub.toUpperCase(),
    size: 0.052 * U,
    font: FONTS.body,
    weight: 800,
    spacing: 0.14,
    color: INK,
  };
  const top = 0.016 * U + 0.045 * U;
  drawWords(face, title, WIDTH / 2, top + title.size / 2);
  drawWords(face, status, WIDTH / 2, top + title.size + 0.015 * U + status.size / 2);
  face.texture.needsUpdate = true;
  return face;
}

/** A warning lamp: a dark collar and a rounded amber cap, standing up along the prototype's z */
function lampShape(): BufferGeometry {
  const r = LAMP.size / 2;
  const cap = mergeGeometries([
    new CylinderGeometry(r * 0.9, r * 0.9, r, 16).translate(0, r / 2, 0),
    new SphereGeometry(r * 0.9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, r, 0),
  ]);
  return cap.rotateX(Math.PI / 2);
}

/** The soft amber glow round a lit lamp */
function glow(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d");
  if (context) {
    const fade = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    fade.addColorStop(0, GLOW);
    fade.addColorStop(1, "rgba(255, 170, 30, 0)");
    context.fillStyle = fade;
    context.fillRect(0, 0, 64, 64);
  }
  return new CanvasTexture(canvas);
}

type Props = MotionProps & {
  /** where it stands: the prototype's units on its card → the map */
  place: Matrix4;
  name: string;
  sub: string;
};

/** The future-city plot's barricade, its lamps blinking while pointed at */
export function Barricade({ place, name, sub, ...motion }: Props) {
  const { model, toModel } = useParts("/models/barricade.glb");
  const light = useRoomLight();
  const still = useStill();
  const pointer = usePointer();
  const play = usePlayWhilePointed(BLINK, {
    ...motion,
    pointing: motion.pointing || pointer.pointing,
  });
  const fromModel = useMemo(() => toModel.clone().invert(), [toModel]);
  const face = useMemo(() => paintBoard(name, sub), [name, sub]);
  const sheet = useMemo(() => flatSheet(FACE, OUT, LIFT), []);
  const look = useMemo(() => faceMaterial(face.texture, light), [face, light]);
  const shape = useMemo(() => lampShape(), []);
  const collar = useMemo(
    () => new CylinderGeometry(LAMP.size / 2, LAMP.size / 2, 0.015 * U, 16).rotateX(Math.PI / 2),
    [],
  );
  const dark = useMemo(
    () =>
      withRoomLight(new MeshStandardMaterial({ color: INK, roughness: 1, metalness: 0 }), light),
    [light],
  );
  const lamps = useMemo(
    () =>
      [0, 1].map(
        () =>
          withRoomLight(
            new MeshStandardMaterial({
              color: OFF,
              emissive: ON,
              emissiveIntensity: 0,
              roughness: 0.6,
              metalness: 0,
            }),
            light,
          ) as MeshStandardMaterial,
      ),
    [light],
  );
  const halo = useMemo(
    () => new SpriteMaterial({ map: glow(), transparent: true, depthWrite: false, opacity: 0 }),
    [],
  );
  const halos = useMemo(() => [halo, halo.clone()], [halo]);
  useEffect(
    () => () => {
      for (const thing of [
        sheet,
        look,
        face.texture,
        shape,
        collar,
        dark,
        ...lamps,
        halo.map,
        ...halos,
      ])
        thing?.dispose();
    },
    [sheet, look, face, shape, collar, dark, lamps, halo, halos],
  );

  // the lamps' spots: along the board's top edge, back into the middle of its thickness
  const spots = useMemo(() => {
    const [tl, tr] = FACE;
    return [LAMP.in, WIDTH - LAMP.in].map((x) =>
      [0, 1, 2].map(
        (i) =>
          tl[i] + ((tr[i] - tl[i]) * x) / WIDTH - OUT[i] * LAMP.back + (i === 2 ? LAMP.top : 0),
      ),
    );
  }, []);

  useFrame(() => {
    const t = still ? undefined : play();
    lamps.forEach((lamp, i) => {
      const lit = t !== undefined && (t - i * LAG + BLINK) % BLINK < BLINK / 2;
      lamp.color.set(lit ? ON : OFF);
      lamp.emissiveIntensity = lit ? 0.9 : 0;
      halos[i].opacity = lit ? 1 : 0;
    });
  });

  return (
    <group matrixAutoUpdate={false} matrix={place} {...pointer.bind}>
      <group matrixAutoUpdate={false} matrix={fromModel}>
        <primitive object={model} />
      </group>
      <mesh geometry={sheet} material={look} />
      {spots.map((spot, i) => (
        <group key={i} position={spot as [number, number, number]}>
          <mesh geometry={collar} material={dark} position={[0, 0, 0.0075 * U]} />
          <mesh geometry={shape} material={lamps[i]} position={[0, 0, 0.012 * U]} />
          <sprite material={halos[i]} position={[0, 0, LAMP.size * 0.6]} scale={0.4 * U} />
        </group>
      ))}
    </group>
  );
}
