"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  type Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
} from "three";
import { ease, type MotionProps } from "./motion/cycle";
import { usePlayOnPoke } from "./motion/pointing";
import { useRoomLight } from "./roomLight";
import { COLUMNS, FLAT, FRONT, INK, LAG, LINES, PAGE, PAPER, ROWS, SPINE, TURN } from "./TurningPage.constants";

// A page turning over the open book, as on the prototype's map (its bookFlipFrame()). The page is
// a grid of points, and each one turns round the spine from the right-hand page to the left-hand
// one: slowly, then fast, then slowly. The top outer corner leads, and the points nearer the spine
// and the foot of the page follow up to 30% of the turn later, so the page curls over the way it
// does when you turn it by its corner. Each row is laid out from the spine one step at a time, each
// step in the direction its own point has turned to, which is what bends the page.

/** How far round the spine the point s out from it and z up the page has turned, t of the way through */
function angle(s: number, z: number, t: number): number {
  const lead = (s / PAGE.width) * (0.5 + (0.5 * z) / PAGE.height); // 1 at the top outer corner
  return PAGE.open + (Math.PI - 2 * PAGE.open) * ease((t - LAG * (1 - lead)) / (1 - LAG));
}

/** The page's paper with its lines of writing, the same on both sides */
function writing(): CanvasTexture {
  const width = 512;
  const height = Math.round((width * PAGE.height) / PAGE.width);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = PAPER;
    context.fillRect(0, 0, width, height);
    context.fillStyle = INK;
    for (let k = 0; k < LINES.count; k++) {
      const top = LINES.first + k * LINES.gap + LINES.height;
      context.fillRect(
        (LINES.from / PAGE.width) * width,
        (1 - top / PAGE.height) * height,
        ((LINES.to - LINES.from) / PAGE.width) * width,
        (LINES.height / PAGE.height) * height,
      );
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** The grid of the page: its points move every frame, the paper stays pinned to them */
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
      if (r < ROWS && i < COLUMNS) index.push(v, v + 1, v + COLUMNS + 2, v, v + COLUMNS + 2, v + COLUMNS + 1);
    }
  }
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  geometry.setIndex(index);
  return geometry;
}

/** Bends the page to how it lies t of the way through its turn */
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

/**
 * The turning page, in book.glb's own frame: put it in the same group as the book model. It turns
 * once each time `poke` goes up, and shows only while it turns; at rest it would lie exactly on the
 * book's own pages.
 */
export function TurningPage({ speed = 1, at, poke }: MotionProps) {
  const page = useRef<Mesh>(null);
  const play = usePlayOnPoke(TURN, { speed, poke });
  const light = useRoomLight();
  const geometry = useMemo(() => sheet(), []);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        map: writing(),
        side: DoubleSide,
        roughness: 1,
        metalness: 0,
        envMap: light,
        envMapIntensity: 0.5,
        // where the page still lies on the book's own pages, it is drawn over them
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -4,
      }),
    [light],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(() => {
    if (!page.current) return;
    const t = at ?? (play() ?? 0) / TURN;
    page.current.visible = t > 0 && t < 1;
    if (page.current.visible) bend(geometry, t);
  });

  return <mesh ref={page} geometry={geometry} material={material} frustumCulled={false} />;
}
