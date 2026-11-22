"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  type Mesh,
  Matrix4,
  MeshStandardMaterial,
  type Object3D,
  Vector3,
} from "three";
import { ease, type MotionProps, useCycle } from "../../utils/cycle";
import { moveInPrototype, turnAbout } from "../../utils/prototype";
import { useParts } from "../../utils/useParts";
import { useRoomLight, withRoomLight } from "../../utils/roomLight";
import { BLOOM, HEADS } from "../../constants/cities/story/Wildflowers.constants";

// Story City's wildflowers open and close, each at its own pace, as on the prototype's Story City
// map (its `bloom` keyframes): a flower's head grows out of its bud with a little twist, overshoots
// a touch, stays open most of the while, then shrinks back into the bud and is gone a moment. Each
// takes 9 to 16 seconds to go round, and starts somewhere else in it, so they never move together.

/** How the head looks t (0 to 1) of the way round, easing in and out between keyframes as the map does */
function bloomAt(t: number): { size: number; twist: number; solid: number } {
  let i = 0;
  while (i < BLOOM.length - 2 && t > BLOOM[i + 1][0]) i++;
  const [t0, s0, w0, o0] = BLOOM[i];
  const [t1, s1, w1, o1] = BLOOM[i + 1];
  const k = ease((t - t0) / (t1 - t0));
  return { size: s0 + (s1 - s0) * k, twist: w0 + (w1 - w0) * k, solid: o0 + (o1 - o0) * k };
}

/** Each flower's round (9 to 16 s) and how far into it it starts, as the map spreads them */
const round = (i: number) => 9 + ((i * 37) % 8);
const startAt = (i: number) => ((i * 53) % 97) / 97;

/** Story City's patch of wildflowers, opening and closing, in the model's own units */
export function Wildflowers(motion: MotionProps) {
  const { model, part, toModel } = useParts("/models/wildflowers.glb");
  const light = useRoomLight();
  // one long clock, read against each flower's own round
  const clock = useCycle(16 * 9 * 13 * 11 * 15 * 7, motion);
  const buds = useRef<(Mesh | null)[]>([]);
  const budShape = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const budLooks = useMemo(
    () =>
      HEADS.map(({ bud }) =>
        withRoomLight(
          new MeshStandardMaterial({ color: bud.color, roughness: 1, metalness: 0 }),
          light,
        ),
      ),
    [light],
  );
  // each head's materials, made see-through so it can fade as it closes
  const heads = useMemo(() => {
    return HEADS.map((_, i) => {
      const head = part(`head-${i}`);
      const looks: MeshStandardMaterial[] = [];
      head?.traverse((object: Object3D) => {
        const mesh = object as Mesh;
        if (mesh.isMesh && mesh.material instanceof MeshStandardMaterial) {
          mesh.material.transparent = true;
          looks.push(mesh.material);
        }
      });
      return { head, looks };
    });
  }, [part]);
  useEffect(
    () => () => {
      budShape.dispose();
      for (const look of budLooks) look.dispose();
    },
    [budShape, budLooks],
  );

  useFrame(() => {
    HEADS.forEach(({ top, axis, bud }, i) => {
      // `at` holds every flower at that share of its own round
      const t = motion.at ?? (clock() / round(i) + startAt(i)) % 1;
      const { size, twist, solid } = bloomAt(motion.at === undefined ? t : (t + startAt(i)) % 1);
      const { head, looks } = heads[i];
      if (head) {
        const grow = new Matrix4()
          .makeTranslation(top[0], top[1], top[2])
          .multiply(turnAbout([0, 0, 0], axis, twist))
          .multiply(new Matrix4().makeScale(size, size, size))
          .multiply(new Matrix4().makeTranslation(-top[0], -top[1], -top[2]));
        moveInPrototype(head, toModel, grow);
        head.visible = solid > 0.01;
        for (const look of looks) look.opacity = solid;
      }
      // the bud shows while the head is small, and sinks into the stem as it opens over it
      const shown = Math.min(1, Math.max(0, (0.75 - size) / 0.45));
      const box = buds.current[i];
      if (box) {
        box.visible = shown > 0.01;
        box.scale.set(bud.size[0] * shown, bud.size[1] * shown, bud.size[2] * shown);
        box.position.copy(
          new Vector3(...bud.from).add(
            new Vector3(bud.size[0] / 2, bud.size[1] / 2, (bud.size[2] * shown) / 2),
          ),
        );
      }
    });
  });

  return (
    <group>
      <primitive object={model} />
      {/* the buds are placed in the prototype's units */}
      <group matrixAutoUpdate={false} matrix={toModel}>
        {HEADS.map((_, i) => (
          <mesh
            key={i}
            ref={(mesh) => {
              buds.current[i] = mesh;
            }}
            geometry={budShape}
            material={budLooks[i]}
          />
        ))}
      </group>
    </group>
  );
}
