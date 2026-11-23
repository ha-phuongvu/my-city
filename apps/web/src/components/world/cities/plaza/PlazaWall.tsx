"use client";

import { useEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry, DoubleSide, MeshStandardMaterial } from "three";
import { boxesToMesh, brickRing, stretchesFrom } from "../../utils/brickRing";
import { CAP, OPEN, PIECES, RADIUS } from "../../constants/cities/plaza/PlazaWall.constants";
import { useRoomLight, withRoomLight } from "../../utils/roomLight";

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
