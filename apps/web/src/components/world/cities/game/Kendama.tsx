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
import type { MotionProps } from "../../utils/cycle";
import { usePlayWhilePointed } from "../../utils/pointing";
import { moveInPrototype } from "../../utils/prototype";
import { useParts } from "../../utils/useParts";
import { useRoomLight, withRoomLight } from "../../utils/roomLight";
import {
  AGAIN,
  BALL_TURN,
  EASE_IN,
  PATH,
  REST,
  type Spot,
  STRING,
  SWING,
  TOY,
} from "../../constants/cities/game/Kendama.constants";
import { kendamaString } from "../../utils/kendamaString";
import { CROSS } from "../../constants/kendamaString.constants";

// Game City's kendama: the ball pops off the spike, swings out and down on its string, round behind
// the handle (well clear of it) and up the other side, and lands back on the spike, then rests (the
// prototype's KEN_PATH: the ball at 12 spots, then 2.4 s on the spike). Here it glides through those
// spots, turning as it goes (a cream stripe round it through its hole shows it): on the spike the
// hole faces down onto it; off it, the hole turns a quarter turn on from the toy's middle, and it
// lands hole down. It swings again and again while Game City is pointed at, resting a moment on the
// spike between swings, and once the pointer leaves it lands and rests there. The string is drawn here as mKendama draws it: swinging, it trails behind the ball in a
// curve and keeps its length; at rest it bows out in front of the spike.

// behind the toy's plane is -y in its own frame (mKendama: B = [across, -behind, up])
const toy = ([across, up, behind = 0]: Spot) => new Vector3(across, -behind, up);
const SPOTS = new CatmullRomCurve3(PATH.map(toy), false, "centripetal");
const UNTOY = new Matrix4().copy(TOY).invert();

/** How the ball is turned at `at` (mKendama's hb, gb, nb: its hole's way out, and two ways square to it) */
function facing(at: Vector3): Matrix4 {
  const middle = new Vector3(0, 0, CROSS.z).sub(at).normalize();
  const k = Math.min(1, Math.max(0, (at.distanceTo(toy(REST)) - BALL_TURN.from) / BALL_TURN.over));
  const s = k * k * (3 - 2 * k);
  const hole = middle
    .clone()
    .multiplyScalar(1 - s)
    .addScaledVector(new Vector3(-middle.z, 0, middle.x), s)
    .normalize();
  const up = new Vector3(...BALL_TURN.up);
  const side = up.addScaledVector(hole, -up.dot(hole));
  if (side.length() > 1e-3) side.normalize();
  else side.set(0, hole.z, -hole.y).normalize();
  return new Matrix4().makeBasis(hole, side, hole.clone().cross(side));
}

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
  const play = usePlayWhilePointed(SWING, motion, AGAIN);
  const drawn = useRef(-1);
  const look = useMemo(
    () =>
      withRoomLight(
        new MeshStandardMaterial({ color: STRING.color, roughness: 1, metalness: 0 }),
        light,
      ),
    [light],
  );
  const inToy = useMemo(() => new Matrix4().copy(toModel).multiply(TOY), [toModel]);
  // (the ball's own frame on the spike, undone, before it's turned and moved to where it is now)
  const unrest = useMemo(() => {
    const rest = toy(REST);
    return facing(rest)
      .invert()
      .multiply(new Matrix4().makeTranslation(-rest.x, -rest.y, -rest.z));
  }, []);
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
      const swing = new Matrix4()
        .makeTranslation(at.x, at.y, at.z)
        .multiply(facing(at))
        .multiply(unrest);
      moveInPrototype(ball, toModel, new Matrix4().copy(TOY).multiply(swing).multiply(UNTOY));
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
