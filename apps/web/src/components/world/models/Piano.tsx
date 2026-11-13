"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CanvasTexture,
  type Mesh,
  MeshStandardMaterial,
  type Sprite,
  SpriteMaterial,
  SRGBColorSpace,
} from "three";
import type { MotionProps } from "../motion/cycle";
import { usePlayOnPoke } from "../motion/pointing";
import { useParts } from "../motion/useParts";
import { useRoomLight, withRoomLight } from "../roomLight";
import {
  KEYS,
  NOTE_DRIFT,
  NOTE_FROM,
  NOTE_LIFE,
  NOTE_RISE,
  NOTE_SIZE,
  NOTE_TIME,
  NOTES,
  PRESSED,
  R,
  TUNE,
} from "./Piano.constants";

// Each time Music City is pointed at, its grand piano plays a short tune, a key at a time (the
// prototype's frames: keys 3, 5, 7, 5, 10, 8, 6, 4 at 300 ms each). A pressed key is drawn as the
// prototype draws it: a slightly taller key over the white keys, in shade. As it starts, three ♪s
// rise over the piano and fade, one after another, as on the map; pointing again once the tune is
// over starts it all again.

/** A ♪ in the map's deep red with a thin white edge, as on the map */
function glyph(text: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.font = "bold 104px Georgia, 'Apple Symbols', 'Segoe UI Symbol', serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "rgba(255, 255, 255, 0.9)";
    context.fillText(text, 64, 66);
    context.fillStyle = "rgba(176, 70, 63, 0.9)";
    context.fillText(text, 64, 64);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Music City's grand piano, playing its little tune when pointed at */
export function Piano(motion: MotionProps) {
  const { model, toModel } = useParts("/models/piano.glb");
  const light = useRoomLight();
  const key = useRef<Mesh>(null);
  const notes = useRef<(Sprite | null)[]>([]);
  const tune = usePlayOnPoke(TUNE.length * NOTE_TIME, motion);
  // how long since the tune started, for the ♪s, which go on rising after it's over
  const float = useRef<number | undefined>(undefined);
  const before = useRef<number | undefined>(undefined);
  const shape = useMemo(() => new BoxGeometry(KEYS.length, KEYS.width - 2 * PRESSED.gap, PRESSED.height), []);
  const shade = useMemo(
    () => withRoomLight(new MeshStandardMaterial({ color: PRESSED.color, roughness: 1, metalness: 0 }), light),
    [light],
  );
  const looks = useMemo(
    () => NOTES.map((note) => new SpriteMaterial({ map: glyph(note.glyph), transparent: true, depthWrite: false })),
    [],
  );
  useEffect(
    () => () => {
      shape.dispose();
      shade.dispose();
      for (const look of looks) {
        look.map?.dispose();
        look.dispose();
      }
    },
    [shape, shade, looks],
  );

  useFrame((_, delta) => {
    // the key being played, if any
    const t = motion.at === undefined ? tune() : motion.at * TUNE.length * NOTE_TIME;
    if (t !== undefined && before.current === undefined) float.current = 0;
    else if (float.current !== undefined) float.current += delta * (motion.speed ?? 1);
    before.current = t;
    const playing = t === undefined ? undefined : TUNE[Math.floor(t / NOTE_TIME)];
    if (key.current) {
      key.current.visible = playing !== undefined;
      if (playing !== undefined) {
        key.current.position.set(
          KEYS.x + KEYS.length / 2,
          KEYS.y + playing * KEYS.width + KEYS.width / 2,
          KEYS.top + PRESSED.height / 2,
        );
      }
    }
    // each ♪ rises once and drifts off to the right, turning a little, fading in quickly and out slowly
    NOTES.forEach((note, i) => {
      const sprite = notes.current[i];
      if (!sprite) return;
      const k = float.current === undefined ? -1 : (float.current - note.delay) / NOTE_LIFE;
      sprite.visible = k >= 0 && k < 1;
      if (!sprite.visible) return;
      const out = 1 - (1 - k) * (1 - k);
      const across = note.across + NOTE_DRIFT * out;
      sprite.position.set(NOTE_FROM[0] + R * across, NOTE_FROM[1] - R * across, NOTE_FROM[2] + NOTE_RISE * out);
      sprite.scale.setScalar(NOTE_SIZE * (0.7 + 0.35 * k));
      looks[i].opacity = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      looks[i].rotation = ((8 - 18 * k) * Math.PI) / 180;
    });
  });

  return (
    <group>
      <primitive object={model} />
      {/* the key and the notes are placed in the prototype's units */}
      <group matrixAutoUpdate={false} matrix={toModel}>
        <mesh ref={key} geometry={shape} material={shade} visible={false} />
        {looks.map((look, i) => (
          <sprite
            key={i}
            ref={(sprite) => {
              notes.current[i] = sprite;
            }}
            material={look}
            visible={false}
          />
        ))}
      </group>
    </group>
  );
}
