"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  FrontSide,
  type Group,
  MeshStandardMaterial,
  type Side,
  SRGBColorSpace,
} from "three";
import {
  PRINT_BACK,
  PRINT_FRONT,
  type PrintLayer,
} from "../../constants/cities/story/bookPrintLayout.constants";
import type { MotionProps } from "../../utils/cycle";
import { usePlayWhilePointed } from "../../utils/pointing";
import { useRoomLight } from "../../utils/roomLight";
import {
  AGAIN,
  COLUMNS,
  FLAT,
  FRONT,
  LAG,
  PAGE,
  PAPER,
  PRINT_PIXELS,
  ROWS,
  SPINE,
  TURN,
} from "../../constants/cities/story/TurningPage.constants";
import { ease } from "../../utils/curves";

function angle(s: number, z: number, t: number): number {
  const lead = (s / PAGE.width) * (0.5 + (0.5 * z) / PAGE.height);
  return PAGE.open + (Math.PI - 2 * PAGE.open) * ease((t - LAG * (1 - lead)) / (1 - LAG));
}

function printed(layers: PrintLayer[]): CanvasTexture {
  const width = PRINT_PIXELS;
  const height = Math.round((width * PAGE.height) / PAGE.width);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = PAPER;
    context.fillRect(0, 0, width, height);
    for (const [color, shapes] of layers) {
      context.fillStyle = color;
      for (const shape of shapes) {
        context.beginPath();
        shape.forEach(([s, z], k) => {
          const x = (s / PAGE.width) * width;
          const y = (1 - z / PAGE.height) * height;
          if (k) context.lineTo(x, y);
          else context.moveTo(x, y);
        });
        context.fill();
      }
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
      const v = r * (COLUMNS + 1) + i;
      uv[v * 2] = i / COLUMNS;
      uv[v * 2 + 1] = r / ROWS;
      if (r < ROWS && i < COLUMNS)
        index.push(v, v + 1, v + COLUMNS + 2, v, v + COLUMNS + 2, v + COLUMNS + 1);
    }
  }
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  geometry.setIndex(index);
  return geometry;
}

function bend(geometry: BufferGeometry, t: number) {
  const position = geometry.getAttribute("position") as BufferAttribute;
  const step = PAGE.width / COLUMNS;
  for (let r = 0; r <= ROWS; r++) {
    const z = (r * PAGE.height) / ROWS;
    let flat = 0;
    let front = 0;
    for (let i = 0; i <= COLUMNS; i++) {
      position.setXYZ(
        r * (COLUMNS + 1) + i,
        SPINE[0] + FLAT[0] * flat + FRONT[0] * front,
        SPINE[1] + z,
        SPINE[2] + FLAT[2] * flat + FRONT[2] * front,
      );
      const a = angle((i + 0.5) * step, z, t);
      flat += Math.cos(a) * step;
      front += Math.sin(a) * step;
    }
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

export function TurningPage({ speed = 1, at, pointing }: MotionProps) {
  const page = useRef<Group>(null);
  const play = usePlayWhilePointed(TURN, { speed, pointing }, AGAIN);
  const light = useRoomLight();
  const geometry = useMemo(() => sheet(), []);
  const [front, back] = useMemo(() => {
    const side = (layers: PrintLayer[], which: Side) =>
      new MeshStandardMaterial({
        map: printed(layers),
        side: which,
        roughness: 1,
        metalness: 0,
        envMap: light,
        envMapIntensity: 0.5,

        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -4,
      });
    return [side(PRINT_FRONT, FrontSide), side(PRINT_BACK, BackSide)];
  }, [light]);
  useEffect(
    () => () => {
      geometry.dispose();
      for (const material of [front, back]) {
        material.map?.dispose();
        material.dispose();
      }
    },
    [geometry, front, back],
  );

  useFrame(() => {
    if (!page.current) return;
    const t = at ?? (play() ?? 0) / TURN;
    page.current.visible = t > 0 && t < 1;
    if (page.current.visible) bend(geometry, t);
  });

  return (
    <group ref={page}>
      <mesh geometry={geometry} material={front} frustumCulled={false} />
      <mesh geometry={geometry} material={back} frustumCulled={false} />
    </group>
  );
}
