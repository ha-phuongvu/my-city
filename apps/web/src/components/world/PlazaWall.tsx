"use client";

import { useEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry, DoubleSide, MeshStandardMaterial } from "three";
import { boxesToMesh, brickRing, stretchesFrom } from "./brickRing";
import { CAP, OPEN, PIECES, RADIUS } from "./PlazaWall.constants";
import { useRoomLight, withRoomLight } from "./roomLight";

// The low brick wall curving round the World Plaza's edge, like the cities' walls, with a stone
// capstone, as on the prototype's map (its brickRing(0, 0, 4.86, …, 4242, …, 5)). It is open where
// each path comes in, and a stretch shorter than five pieces between two openings is left out too,
// so it's open all along the right where three paths come in. The open stretches are the ones the
// prototype works out from where its paths run (artifact version 1794556890-259a).

/** The wall round the plaza: lit like the world's other standing things (world-props.glb) */
export function PlazaWall() {
  const light = useRoomLight();
  const geometry = useMemo(() => {
    const mesh = boxesToMesh(brickRing(0, 0, RADIUS, CAP, 4242, stretchesFrom(PIECES, OPEN)));
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(mesh.position, 3));
    g.setAttribute("normal", new BufferAttribute(mesh.normal, 3));
    g.setAttribute("color", new BufferAttribute(mesh.color, 3));
    g.computeBoundingSphere();
    return g;
  }, []);
  const material = useMemo(
    () =>
      withRoomLight(
        new MeshStandardMaterial({
          vertexColors: true,
          metalness: 0,
          roughness: 1,
          side: DoubleSide,
        }),
        light,
      ),
    [light],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} receiveShadow />;
}
