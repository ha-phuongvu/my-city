"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  DoubleSide,
  type Group,
  Matrix4,
  type Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";
import { useInCity } from "../utils/cityPointing";
import { useStill } from "../utils/pointing";
import {
  AIM,
  BEAM,
  BEAM_KEYS,
  BEAM_STOPS,
  BURST,
  FADE,
  FLASH,
  GLOW_KEYS,
  GLOW_STOPS,
  LENS,
  LOOP,
  OUT,
  RAY,
  STAR_KEYS,
} from "../constants/CameraFlash.constants";

// Movie City's film camera fires its flash while the city is pointed at, as on the prototype's map
// (its .fx-flash): two quick flashes from the lens, a white burst and a four-point glint, then a beam
// of warm light shines out of it across the front of the lawn, flickering like a projector's for as
// long as the pointer stays. When it leaves, the light fades away. The beam is a flat fan of light
// that turns about its own line to face the viewer, so it looks the same from every side.

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** The value `index` of a list of keyframes at share k of the way through, eased from each to the next if `eased` */
function keyed(keys: readonly (readonly number[])[], k: number, index: number, eased: boolean): number {
  let i = 0;
  while (i < keys.length - 2 && k > keys[i + 1][0]) i++;
  const [a, b] = [keys[i], keys[i + 1]];
  const t = Math.min(1, Math.max(0, (k - a[0]) / (b[0] - a[0])));
  return a[index] + (b[index] - a[index]) * (eased ? easeOut(t) : t);
}

function painted(size: [number, number], paint: (context: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement("canvas");
  [canvas.width, canvas.height] = size;
  const context = canvas.getContext("2d");
  if (context) paint(context, size[0], size[1]);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** The beam, lying along its picture from the lens (left) to its far end (right), narrow at the lens and widening out */
const beamPicture = () =>
  painted([256, 128], (context, w, h) => {
    const fill = context.createLinearGradient(0, 0, w, 0);
    for (const [at, color] of BEAM_STOPS) fill.addColorStop(at, color);
    const b = BEAM.blur;
    const near = (BEAM.near / BEAM.far) * (h - 2 * b);
    context.filter = `blur(${b}px)`;
    context.fillStyle = fill;
    context.beginPath();
    context.moveTo(b, h / 2 - near / 2);
    context.lineTo(w - b, b);
    context.lineTo(w - b, h - b);
    context.lineTo(b, h / 2 + near / 2);
    context.closePath();
    context.fill();
  });

/** The burst: white in the middle, warm gold round it, fading out */
const glowPicture = () =>
  painted([128, 128], (context, w) => {
    const fill = context.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w * Math.SQRT1_2);
    for (const [at, color] of GLOW_STOPS) fill.addColorStop(at, color);
    context.fillStyle = fill;
    context.fillRect(0, 0, w, w);
  });

/** The glint: two thin rays crossing, brightest where they cross */
const starPicture = () =>
  painted([128, 128], (context, w) => {
    const ray = RAY * w;
    for (const across of [true, false]) {
      const fill = across ? context.createLinearGradient(0, 0, w, 0) : context.createLinearGradient(0, 0, 0, w);
      fill.addColorStop(0, "rgba(255, 255, 255, 0)");
      fill.addColorStop(0.5, "rgba(255, 255, 255, 0.95)");
      fill.addColorStop(1, "rgba(255, 255, 255, 0)");
      context.fillStyle = fill;
      if (across) context.fillRect(0, (w - ray) / 2, w, ray);
      else context.fillRect((w - ray) / 2, 0, ray, w);
    }
  });

/** Movie City's camera flash and its flickering beam, while the city is pointed at */
export function CameraFlash() {
  const still = useStill();
  const pointing = useInCity("movie");
  const flash = useRef<Group>(null);
  const beam = useRef<Mesh>(null);
  const glow = useRef<Sprite>(null);
  const star = useRef<Sprite>(null);
  // how far into the flash it is (undefined while there's none), and how long since the pointer left
  const time = useRef<number | undefined>(undefined);
  const gone = useRef<number | undefined>(undefined);
  const lens = useMemo(() => new Vector3(...LENS), []);
  const reach = useMemo(() => new Vector3(...AIM).sub(lens), [lens]);
  // the beam's picture lies along x from 0 to 1, y from -1/2 to 1/2
  const sheet = useMemo(() => new PlaneGeometry(1, 1).translate(0.5, 0, 0), []);
  const [beamLook, glowLook, starLook] = useMemo(() => {
    const shared = { transparent: true, depthWrite: false, toneMapped: false, opacity: 0 };
    return [
      new MeshBasicMaterial({ ...shared, map: beamPicture(), side: DoubleSide }),
      new SpriteMaterial({ ...shared, map: glowPicture() }),
      new SpriteMaterial({ ...shared, map: starPicture() }),
    ];
  }, []);
  useEffect(
    () => () => {
      sheet.dispose();
      for (const look of [beamLook, glowLook, starLook]) {
        look.map?.dispose();
        look.dispose();
      }
    },
    [sheet, beamLook, glowLook, starLook],
  );
  const work = useMemo(() => ({ side: new Vector3(), facing: new Vector3(), toViewer: new Vector3(), place: new Matrix4() }), []);

  useFrame(({ camera }, delta) => {
    // it starts afresh each time the pointer comes into the city (and with less motion it never does)
    if (pointing && !still && (time.current === undefined || gone.current !== undefined)) {
      time.current = 0;
      gone.current = undefined;
    } else if (!pointing && time.current !== undefined) gone.current ??= 0;
    if (time.current !== undefined) {
      time.current += delta;
      if (time.current > LOOP[1] * FLASH) time.current -= (LOOP[1] - LOOP[0]) * FLASH;
      if (gone.current !== undefined) {
        gone.current += delta;
        if (gone.current >= FADE) time.current = gone.current = undefined;
      }
    }
    if (!flash.current) return;
    flash.current.visible = time.current !== undefined;
    if (time.current === undefined) return;
    const k = time.current / FLASH;
    const dim = gone.current === undefined ? 1 : 1 - gone.current / FADE;

    // the burst and the glint, just out of the lens toward the viewer
    const { side, facing, toViewer, place } = work;
    toViewer.copy(camera.position).sub(lens).normalize();
    for (const [sprite, keys, sizeAt] of [
      [glow.current, GLOW_KEYS, 2],
      [star.current, STAR_KEYS, 3],
    ] as const) {
      if (!sprite) continue;
      sprite.position.copy(lens).addScaledVector(toViewer, OUT);
      sprite.scale.setScalar(BURST * keyed(keys, k, sizeAt, true));
      sprite.material.opacity = keyed(keys, k, 1, true) * dim;
    }
    if (star.current) star.current.material.rotation = (-keyed(STAR_KEYS, k, 2, true) * Math.PI) / 180;

    // the beam, along its line from the lens and turned about it to face the viewer
    if (beam.current) {
      side.copy(reach).cross(toViewer).normalize().multiplyScalar(BEAM.far * reach.length());
      facing.copy(reach).cross(side).normalize();
      place.makeBasis(reach, side, facing).setPosition(lens);
      beam.current.matrix.copy(place);
      beam.current.matrixWorldNeedsUpdate = true;
      (beam.current.material as MeshBasicMaterial).opacity = keyed(BEAM_KEYS, k, 1, false) * dim;
    }
  });

  return (
    <group ref={flash} visible={false}>
      <mesh ref={beam} geometry={sheet} material={beamLook} matrixAutoUpdate={false} frustumCulled={false} />
      <sprite ref={glow} material={glowLook} />
      <sprite ref={star} material={starLook} />
    </group>
  );
}
