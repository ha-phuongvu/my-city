"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  MeshStandardMaterial,
  SRGBColorSpace,
} from "three";
import { type MotionProps, useCycle } from "../motion/cycle";
import { useParts } from "../motion/useParts";
import { useRoomLight, withRoomLight } from "../roomLight";
import { ACROSS, ALONG, CLOTH, COLUMNS, FLAGS, ROWS } from "./SurveyFlag.constants";

// A survey flag flying in the wind, as on the prototype's map: a wave runs down the cloth from the
// pole to its free end, growing as it goes (surveyFlag's at(u, v) with the phase going once round
// in a little under a second). The model's own cloth stays still, so it is hidden and the cloth is
// drawn here every frame from the same formula, with the same diagonal stripes.

/** Where the point u along the cloth and v down from its top edge is, with the wave at phase ph */
function at(u: number, v: number, ph: number): [number, number, number] {
  const sway = 0.07 * (0.45 + (0.75 * u) / CLOTH.length) * Math.sin(u * 6.5 - ph);
  const drop = 0.04 * Math.sin(u * 4 - ph) * (0.5 + u / CLOTH.length);
  return [
    ALONG[0] * (u + 0.04) + ACROSS[0] * sway,
    ALONG[1] * (u + 0.04) + ACROSS[1] * sway,
    CLOTH.top - v - drop,
  ];
}

/** The cloth's diagonal stripes, as long and deep as the cloth itself */
function stripes(colors: string[]): CanvasTexture {
  const scale = 640;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(CLOTH.length * scale);
  canvas.height = Math.round(CLOTH.depth * scale);
  const context = canvas.getContext("2d");
  if (context) {
    // band k is where u + v runs from k to k + 1 stripe widths, the first one at the pole's top
    const reach = (CLOTH.length + CLOTH.depth) * scale;
    for (let k = 0; k * CLOTH.stripe * scale < reach; k++) {
      const a = k * CLOTH.stripe * scale;
      const b = a + CLOTH.stripe * scale;
      context.fillStyle = colors[k % 2];
      context.beginPath();
      context.moveTo(a, 0);
      context.lineTo(b, 0);
      context.lineTo(b - reach, reach);
      context.lineTo(a - reach, reach);
      context.closePath();
      context.fill();
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** The grid of the cloth: its points move every frame, the stripes stay pinned to them */
function sheet(): BufferGeometry {
  const geometry = new BufferGeometry();
  const count = (COLUMNS + 1) * (ROWS + 1);
  const uv = new Float32Array(count * 2);
  const index: number[] = [];
  for (let r = 0; r <= ROWS; r++) {
    for (let i = 0; i <= COLUMNS; i++) {
      const p = r * (COLUMNS + 1) + i;
      uv[p * 2] = i / COLUMNS;
      uv[p * 2 + 1] = 1 - r / ROWS;
      if (r < ROWS && i < COLUMNS) index.push(p, p + 1, p + COLUMNS + 2, p, p + COLUMNS + 2, p + COLUMNS + 1);
    }
  }
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  geometry.setIndex(index);
  return geometry;
}

type Props = MotionProps & {
  /** red and white, or blue and white */
  kind?: keyof typeof FLAGS;
  /** seconds for one wave to run down the cloth (the map's flags take 0.9 to 1.04) */
  period?: number;
  /** how far into its wave this flag starts, in seconds, so flags side by side don't flap together */
  lead?: number;
};

/** A survey flag on its pole, its cloth flying, in the model's own units */
export function SurveyFlag({ kind = "red", period = 1, lead = 0, ...motion }: Props) {
  const { src, stripes: colors } = FLAGS[kind];
  const { model, part, toModel } = useParts(src);
  const light = useRoomLight();
  const clock = useCycle(period, motion);
  const geometry = useMemo(() => sheet(), []);
  const material = useMemo(
    () =>
      withRoomLight(
        new MeshStandardMaterial({ map: stripes(colors), side: DoubleSide, roughness: 1, metalness: 0 }),
        light,
      ) as MeshStandardMaterial,
    [colors, light],
  );
  useEffect(() => {
    // the model's own cloth stays put; this one flies
    const own = part("cloth");
    if (own) own.visible = false;
  }, [part]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(() => {
    const ph = 2 * Math.PI * (motion.at ?? (clock() + lead) / period);
    const position = geometry.getAttribute("position") as BufferAttribute;
    for (let r = 0; r <= ROWS; r++) {
      for (let i = 0; i <= COLUMNS; i++) {
        position.setXYZ(r * (COLUMNS + 1) + i, ...at((i / COLUMNS) * CLOTH.length, (r / ROWS) * CLOTH.depth, ph));
      }
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <group>
      <primitive object={model} />
      {/* the cloth is worked out in the prototype's units */}
      <mesh
        matrixAutoUpdate={false}
        matrix={toModel}
        geometry={geometry}
        material={material}
        frustumCulled={false}
      />
    </group>
  );
}
