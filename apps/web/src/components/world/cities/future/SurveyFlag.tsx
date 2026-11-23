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
import { type MotionProps, useCycle } from "../../utils/cycle";
import { useParts } from "../../utils/useParts";
import { useRoomLight, withRoomLight } from "../../utils/roomLight";
import {
  ACROSS,
  ALONG,
  CLOTH,
  COLUMNS,
  FLAGS,
  FlagColor,
  ROWS,
} from "../../constants/cities/future/SurveyFlag.constants";

function at(u: number, v: number, ph: number): [number, number, number] {
  const sway = 0.07 * (0.45 + (0.75 * u) / CLOTH.length) * Math.sin(u * 6.5 - ph);
  const drop = 0.04 * Math.sin(u * 4 - ph) * (0.5 + u / CLOTH.length);
  return [
    ALONG[0] * (u + 0.04) + ACROSS[0] * sway,
    ALONG[1] * (u + 0.04) + ACROSS[1] * sway,
    CLOTH.top - v - drop,
  ];
}

function stripes(colors: string[]): CanvasTexture {
  const scale = 640;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(CLOTH.length * scale);
  canvas.height = Math.round(CLOTH.depth * scale);
  const context = canvas.getContext("2d");
  if (context) {
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
      if (r < ROWS && i < COLUMNS)
        index.push(p, p + 1, p + COLUMNS + 2, p, p + COLUMNS + 2, p + COLUMNS + 1);
    }
  }
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  geometry.setIndex(index);
  return geometry;
}

type Props = MotionProps & {
  kind?: FlagColor;

  period?: number;

  lead?: number;
};

export function SurveyFlag({ kind = FlagColor.Red, period = 1, lead = 0, ...motion }: Props) {
  const { src, stripes: colors } = FLAGS[kind];
  const { model, part, toModel } = useParts(src);
  const light = useRoomLight();
  const clock = useCycle(period, motion);
  const geometry = useMemo(() => sheet(), []);
  const material = useMemo(
    () =>
      withRoomLight(
        new MeshStandardMaterial({
          map: stripes(colors),
          side: DoubleSide,
          roughness: 1,
          metalness: 0,
        }),
        light,
      ) as MeshStandardMaterial,
    [colors, light],
  );
  useEffect(() => {
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
        position.setXYZ(
          r * (COLUMNS + 1) + i,
          ...at((i / COLUMNS) * CLOTH.length, (r / ROWS) * CLOTH.depth, ph),
        );
      }
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <group>
      <primitive object={model} />

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
