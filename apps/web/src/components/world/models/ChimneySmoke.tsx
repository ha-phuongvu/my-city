"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, type Sprite, SpriteMaterial, SRGBColorSpace } from "three";
import { type MotionProps, useCycle } from "../motion/cycle";
import { ACROSS, DOWNWIND, FADE, KEYS, LIFE, LIFE_STEP, PUFF, PUFFS, START } from "./ChimneySmoke.constants";

// Chimney smoke, as on the prototype's Story City map (smokeHtml): soft white puffs leave the chimney
// small and thin, rise, sway, billow wider and drift off downwind as they fade, one after another,
// round and round. The 3D guide asks for it as a particle effect rather than a model, so each puff
// is a sprite: a soft round blot with ragged, wispy edges, always facing the camera.

/** A soft white blot, densest in the middle and wispy at its edge, as the map draws each puff */
function blot(): CanvasTexture {
  const size = 128;
  const paper = document.createElement("canvas");
  paper.width = paper.height = size;
  const context = paper.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(250, 249, 247, 0.95)");
    gradient.addColorStop(0.4, "rgba(244, 243, 241, 0.72)");
    gradient.addColorStop(0.7, "rgba(238, 237, 235, 0.28)");
    gradient.addColorStop(1, "rgba(238, 237, 235, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    // ragged edges: the map runs the puffs through a turbulence filter; here a few soft bites are
    // taken out of the edge and a few soft lumps added
    context.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 9; i++) {
      const a = i * 2.39996;
      const r = size * (0.38 + 0.08 * Math.sin(i * 1.7));
      const bite = context.createRadialGradient(
        size / 2 + r * Math.cos(a),
        size / 2 + r * Math.sin(a),
        0,
        size / 2 + r * Math.cos(a),
        size / 2 + r * Math.sin(a),
        size * 0.16,
      );
      bite.addColorStop(0, "rgba(0, 0, 0, 0.55)");
      bite.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = bite;
      context.fillRect(0, 0, size, size);
    }
  }
  const map = new CanvasTexture(paper);
  map.colorSpace = SRGBColorSpace;
  return map;
}

/** Where along the map's keyframes a puff is, k of the way through its life (0 to 1) */
function along<T extends { at: number }>(keys: T[], k: number): [T, T, number] {
  let i = 0;
  while (i < keys.length - 2 && k > keys[i + 1].at) i++;
  const a = keys[i];
  const b = keys[i + 1];
  return [a, b, Math.min(1, Math.max(0, (k - a.at) / (b.at - a.at)))];
}

type Props = MotionProps & {
  /** where the smoke leaves the chimney, in the prototype's units (the building's steam() spot) */
  from: [number, number, number];
  /** how big the plume is (steam()'s s) */
  size: number;
  /** which of the building's chimneys this is (0, 1, …), so neighbouring plumes keep their own pace */
  chimney?: number;
};

/** The smoke rising from one chimney, in the prototype's units: put it in the building's prototype frame */
export function ChimneySmoke({ from, size, chimney = 0, speed = 1, at }: Props) {
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const life = LIFE + LIFE_STEP * chimney;
  const clock = useCycle(life, { speed: still ? 0 : speed, at });
  const puffs = useRef<(Sprite | null)[]>([]);
  const width = ACROSS * size * PUFF;
  // each puff's own sway, drift, last size and strength, from the map's formulas
  const own = useMemo(
    () =>
      Array.from({ length: PUFFS }, (_, i) => ({
        sway: (10 + ((i * 37 + chimney * 11) % 26)) / 100,
        wind: (30 + ((i * 53 + chimney * 7) % 70)) / 100,
        size: 2.4 + ((i * 29) % 9) / 10,
        strength: 0.7 + ((i * 17) % 25) / 100,
        turn: i * 2.1,
      })),
    [chimney],
  );
  const map = useMemo(() => blot(), []);
  const looks = useMemo(
    () =>
      own.map(
        (puff) =>
          new SpriteMaterial({ map, transparent: true, depthWrite: false, rotation: puff.turn }),
      ),
    [own, map],
  );
  useEffect(
    () => () => {
      map.dispose();
      for (const look of looks) look.dispose();
    },
    [map, looks],
  );

  useFrame(() => {
    const time = clock();
    own.forEach((puff, i) => {
      const sprite = puffs.current[i];
      if (!sprite) return;
      // the puffs are spread evenly through one life, the first one furthest up
      const k = (time / life + i / PUFFS) % 1;
      const [a, b, f] = along(KEYS, k);
      const mix = (p: number, q: number) => p + (q - p) * f;
      const up = mix(a.up, b.up) * width;
      const side = (mix(a.sway, b.sway) * puff.sway + mix(a.wind, b.wind) * puff.wind) * width;
      sprite.position.set(
        from[0] + DOWNWIND[0] * side,
        from[1] + DOWNWIND[1] * side,
        from[2] + up + width * START,
      );
      sprite.scale.setScalar(width * mix(a.size, b.size < 0 ? puff.size : b.size));
      const [c, d, g] = along(FADE, k);
      looks[i].opacity = puff.strength * (c.strength + (d.strength - c.strength) * g);
    });
  });

  return (
    <group>
      {looks.map((look, i) => (
        <sprite
          key={i}
          material={look}
          ref={(sprite) => {
            puffs.current[i] = sprite;
          }}
        />
      ))}
    </group>
  );
}
