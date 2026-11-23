"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { BufferAttribute, Color, Matrix4, type Mesh, type Object3D } from "three";
import { preloadModel } from "../core/Model";
import { useParts } from "../utils/useParts";
import { leanAt, leanMatrix } from "../utils/wind";
import { DRIED, SRC } from "../constants/cities/WorldProps.constants";
import { isWinter } from "../utils/season";

type Reed = { root: [number, number, number]; amp: number; rest: Matrix4 };

function dry(part: Object3D) {
  const [reedFrom, reedTo, tailFrom, tailTo] = [...DRIED.reed, ...DRIED.cattail].map(
    (c) => new Color(c),
  );
  const c = new Color();
  part.traverse((object) => {
    const geometry = (object as Mesh).geometry;
    const colors = geometry?.getAttribute("color") as BufferAttribute | undefined;

    if (!colors || geometry.userData.dried) return;
    geometry.userData.dried = true;
    for (let i = 0; i < colors.count; i++) {
      c.fromBufferAttribute(colors, i);
      const [from, to] = c.g > c.r ? [reedFrom, reedTo] : [tailFrom, tailTo];
      c.setRGB((c.r * to.r) / from.r, (c.g * to.g) / from.g, (c.b * to.b) / from.b);
      colors.setXYZ(i, c.r, c.g, c.b);
    }
    colors.needsUpdate = true;
  });
}

function leanFrom(part: Object3D, root: Reed["root"], degrees: number, rest: Matrix4) {
  part.matrix
    .makeTranslation(root[0], root[1], root[2])
    .multiply(leanMatrix(degrees))
    .multiply(new Matrix4().makeTranslation(-root[0], -root[1], -root[2]))
    .multiply(rest);
  part.matrixWorldNeedsUpdate = true;
}

export function WorldProps() {
  const { model, partsNamed } = useParts(SRC);
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const reeds = useMemo(
    () =>
      partsNamed("reeds-").map((part) => {
        if (isWinter()) dry(part);
        part.updateMatrix();
        part.matrixAutoUpdate = false;
        return { part, ...(part.userData as Omit<Reed, "rest">), rest: part.matrix.clone() };
      }),
    [partsNamed],
  );
  useFrame(({ clock }) => {
    if (still) return;
    for (const { part, root, amp, rest } of reeds) {
      leanFrom(part, root, leanAt(amp, root[0], root[2], clock.elapsedTime), rest);
    }
  });
  return <primitive object={model} />;
}

preloadModel(SRC);
