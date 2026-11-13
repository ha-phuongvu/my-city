"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  type Mesh,
  Matrix4,
  MeshStandardMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import type { MotionProps } from "../motion/cycle";
import { usePlayOnPoke } from "../motion/pointing";
import { moveInPrototype } from "../motion/prototype";
import { useParts } from "../motion/useParts";
import { useRoomLight, withRoomLight } from "../roomLight";
import { EASE_IN, PATH, REST, type Spot, STRING, SWING, TOY } from "./Kendama.constants";
import { kendamaString } from "./kendamaString";

// Game City's kendama: the ball pops off the spike, swings out and down on its string, round behind
// the handle (well clear of it) and up the other side, and lands back on the spike, then rests (the
// prototype's KEN_PATH: the ball at 12 spots, then 2.4 s on the spike). Here it glides through those
// spots. It swings once each time Game City is pointed at, and otherwise rests on the spike. The
// string is drawn here as mKendama draws it: swinging, it trails behind the ball in a curve and keeps
// its length; at rest it bows out in front of the spike.

// behind the toy's plane is -y in its own frame (mKendama: B = [across, -behind, up])
const toy = ([across, up, behind = 0]: Spot) => new Vector3(across, -behind, up);
const SPOTS = new CatmullRomCurve3(PATH.map(toy), false, "centripetal");

/** The string from its knot to the ball, `t` of the way through the swing, in the toy's own frame */
function string(t: number): TubeGeometry {
  const k = Math.min(1, Math.max(0, Math.min(t, 1 - t) / EASE_IN));
  const pts = kendamaString(SPOTS.getPoint(t), SPOTS.getTangent(t), k * k * (3 - 2 * k));
  return new TubeGeometry(
    new CatmullRomCurve3(pts, false, "centripetal"),
    24,
    STRING.radius,
    6,
    false,
  );
}

/** Game City's kendama, its ball swinging round on the string */
export function Kendama(motion: MotionProps) {
  const { model, part, toModel } = useParts("/models/kendama.glb");
  const light = useRoomLight();
  const cord = useRef<Mesh>(null);
  const play = usePlayOnPoke(SWING, motion);
  const drawn = useRef(-1);
  const look = useMemo(
    () => withRoomLight(new MeshStandardMaterial({ color: STRING.color, roughness: 1, metalness: 0 }), light),
    [light],
  );
  const inToy = useMemo(() => new Matrix4().copy(toModel).multiply(TOY), [toModel]);
  const rest = useMemo(() => toy(REST).applyMatrix4(TOY), []);
  useEffect(() => {
    // the model's own string stays put; this one follows the ball
    const own = part("string");
    if (own) own.visible = false;
  }, [part]);
  useEffect(() => () => look.dispose(), [look]);

  useFrame(() => {
    const t = motion.at ?? (play() ?? 0) / SWING;
    // (at rest nothing moves, so nothing needs drawing again)
    if (t === drawn.current) return;
    drawn.current = t;
    const at = SPOTS.getPoint(t);
    const ball = part("ball");
    if (ball) {
      const shift = at.clone().applyMatrix4(TOY).sub(rest);
      moveInPrototype(ball, toModel, new Matrix4().makeTranslation(shift.x, shift.y, shift.z));
    }
    if (cord.current) {
      cord.current.geometry.dispose();
      cord.current.geometry = string(t);
    }
  });

  return (
    <group>
      <primitive object={model} />
      <mesh ref={cord} matrixAutoUpdate={false} matrix={inToy} material={look} />
    </group>
  );
}
