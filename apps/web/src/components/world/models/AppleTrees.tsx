"use client";

import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { type BufferGeometry, DoubleSide, type Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from "three";
import { appleGeometry } from "../utils/foliageMesh";
import { leanAt, slideFor } from "../utils/wind";
import { SWAY } from "../constants/wind.constants";
import type { AppleTreePlacement } from "../constants/treeLayout.constants";
import { DROP, DROP_EVERY, GONE, LYING, PICTURE, REGROW, RIGHT } from "../constants/AppleTrees.constants";

// The apples hanging on the apple trees, which sway with their trees. Pointing at an apple tree
// drops one of them, then another every 1.6 seconds while the pointer stays, as on the prototype's
// map (dropApple): it falls, bounces once, rolls a little to one side, lies in the grass a while and
// fades, and 2.5 seconds later grows back on the tree. The prototype moves it over its picture: a
// unit across the picture is √(2/3) of a three.js unit along the screen's right, and a unit down it
// is a unit of height.

const SPOT = new Vector3();

const easeIn = (t: number) => t * t;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

type Hanging = {
  tree: number;
  rest: Vector3;
  radius: number;
  /** when it was let go, and where it rolls (across the picture) and how high it bounces */
  dropped?: { at: number; roll: number; bounce: number };
};

/** How far an apple falls to lie in the grass */
const fallOf = (apple: Hanging) => apple.rest.y - apple.radius * LYING;

/** Where a dropped apple is `age` seconds after it let go: [across the picture, down, opacity, scale] */
function dropAt(apple: Hanging, age: number): [number, number, number, number] {
  const { roll, bounce } = apple.dropped ?? { roll: 0, bounce: 0 };
  const fall = fallOf(apple);
  const k = age / DROP;
  // falls, bounces up and down again, rolls on, lies, fades
  if (k < 0.22) return [0, fall * easeIn(k / 0.22), 1, 1];
  if (k < 0.29) {
    const f = easeOut((k - 0.22) / 0.07);
    return [roll * 0.45 * f, fall - bounce * f, 1, 1];
  }
  if (k < 0.36) {
    const f = easeIn((k - 0.29) / 0.07);
    return [roll * (0.45 + 0.35 * f), fall - bounce * (1 - f), 1, 1];
  }
  if (k < 0.46) return [roll * (0.8 + 0.2 * easeOut((k - 0.36) / 0.1)), fall, 1, 1];
  if (k < 0.84) return [roll, fall, 1, 1];
  if (k < 1) return [roll, fall, (1 - k) / 0.16, 1];
  // gone, then growing back on the tree
  const grow = (age - DROP - GONE) / REGROW;
  if (grow < 0) return [0, 0, 0, 0.1];
  return grow < 1 ? [0, 0, easeOut(grow), 0.1 + 0.9 * easeOut(grow)] : [0, 0, 1, 1];
}

/** The apple trees' apples, dropping when a tree is pointed at */
export function AppleTrees({
  trees,
  still = false,
}: {
  trees: AppleTreePlacement[];
  still?: boolean;
}) {
  const meshes = useRef<(Mesh | null)[]>([]);
  const apples = useRef<Hanging[]>([]);
  const dropping = useRef<{ tree: number; next: number } | null>(null);
  const now = useRef(0);
  const ball = useMemo(() => new SphereGeometry(1, 12, 8), []);
  // the apples, each with its own look so it can fade on its own; shapes shared by colour
  const made = useMemo(() => {
    const shapes = new Map<string, BufferGeometry>();
    const list: { geometry: BufferGeometry; look: MeshBasicMaterial; apple: Hanging }[] = [];
    trees.forEach((t, tree) =>
      t.hanging.forEach(([x, y, z, color]) => {
        if (!shapes.has(color)) shapes.set(color, appleGeometry(1, color));
        list.push({
          geometry: shapes.get(color) as BufferGeometry,
          look: new MeshBasicMaterial({ vertexColors: true, transparent: true, side: DoubleSide }),
          apple: { tree, rest: new Vector3(x, y, z), radius: 0.07 * t.s },
        });
      }),
    );
    return { shapes, list };
  }, [trees]);
  useEffect(() => {
    apples.current = made.list.map((m) => m.apple);
    return () => {
      for (const shape of made.shapes.values()) shape.dispose();
      for (const { look } of made.list) look.dispose();
    };
  }, [made]);
  useEffect(() => () => ball.dispose(), [ball]);

  /** Lets go of one of tree i's apples still hanging, chosen at random */
  const drop = (i: number) => {
    const left = apples.current.filter((a) => a.tree === i && !a.dropped);
    const apple = left[Math.floor(Math.random() * left.length)];
    if (!apple) return;
    // its width on the picture sets how far it rolls and caps how high it bounces
    const width = (2 * apple.radius) / PICTURE;
    apple.dropped = {
      at: now.current,
      roll: (Math.random() < 0.5 ? -1 : 1) * width * (1 + Math.random() * 1.5),
      bounce: Math.min(fallOf(apple) * 0.14, width * 2.2),
    };
  };

  useFrame(({ clock }, delta) => {
    now.current += delta;
    const time = clock.elapsedTime;
    const keep = dropping.current;
    if (keep && now.current >= keep.next) {
      drop(keep.tree);
      keep.next += DROP_EVERY;
    }
    apples.current.forEach((apple, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      const t = trees[apple.tree];
      const age = apple.dropped ? now.current - apple.dropped.at : Infinity;
      if (age >= DROP + GONE + REGROW) apple.dropped = undefined;
      // on the tree it sways with it; once let go it falls from where it hung
      const [across, down, opacity, scale] = apple.dropped ? dropAt(apple, age) : [0, 0, 1, 1];
      const lean = still ? 0 : leanAt(SWAY.apple, t.x, t.z, time);
      const hanging = !apple.dropped || age >= DROP;
      const [sx, sz] = hanging ? slideFor(lean, apple.rest.y - (t.y ?? 0)) : [0, 0];
      SPOT.copy(apple.rest).addScaledVector(RIGHT, across * PICTURE);
      mesh.position.set(SPOT.x + sx, SPOT.y - down, SPOT.z + sz);
      mesh.scale.setScalar(apple.radius * scale);
      made.list[i].look.opacity = opacity;
      mesh.visible = opacity > 0;
    });
  });

  const enter = (i: number) => (event: ThreeEvent<PointerEvent>) => {
    // not while the map is being dragged, nor for anyone who has asked for less motion
    if (still || event.buttons || dropping.current?.tree === i) return;
    drop(i);
    dropping.current = { tree: i, next: now.current + DROP_EVERY };
  };
  const leave = (i: number) => () => {
    if (dropping.current?.tree === i) dropping.current = null;
  };

  return (
    <group>
      {/* where pointing starts it: a ball round each crown, as the prototype's ring round it */}
      {trees.map((t, i) => (
        <mesh
          key={i}
          geometry={ball}
          position={[t.x, (t.y ?? 0) + 0.98 * t.s, t.z]}
          scale={1.15 * 0.66 * t.s * PICTURE}
          visible={false}
          onPointerOver={enter(i)}
          onPointerOut={leave(i)}
        />
      ))}
      {made.list.map(({ geometry, look }, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            meshes.current[i] = mesh;
          }}
          geometry={geometry}
          material={look}
        />
      ))}
    </group>
  );
}
