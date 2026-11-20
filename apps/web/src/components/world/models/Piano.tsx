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
import type { MotionProps } from "../utils/cycle";
import { usePlayWhilePointed } from "../utils/pointing";
import { useParts } from "../utils/useParts";
import { useRoomLight, withRoomLight } from "../utils/roomLight";
import {
  AGAIN,
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
} from "../constants/Piano.constants";

// While Music City is pointed at, its grand piano plays a short tune over and over, a key at a time
// (the prototype's frames: keys 3, 5, 7, 5, 10, 8, 6, 4 at 300 ms each), and ♪s rise over it and
// fade, one setting off every 1.2 s. A pressed key is drawn as the prototype draws it: a slightly
// taller key over the white keys, in shade. Once the pointer leaves, the tune plays to its end and
// the ♪s already rising go on, but no more set off.

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

/** Music City's grand piano, playing its little tune while the city is pointed at */
export function Piano(motion: MotionProps) {
  const { model, toModel } = useParts("/models/piano.glb");
  const light = useRoomLight();
  const key = useRef<Mesh>(null);
  const notes = useRef<(Sprite | null)[]>([]);
  const tune = usePlayWhilePointed(TUNE.length * NOTE_TIME, motion, AGAIN);
  // how long the ♪s have been setting off (undefined while none are rising), and when the pointer left
  // (undefined while it stays)
  const float = useRef<number | undefined>(undefined);
  const left = useRef<number | undefined>(undefined);
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
    const t = tune();
    if (motion.at === undefined) {
      if (motion.pointing) {
        float.current ??= 0;
        left.current = undefined;
      } else if (float.current !== undefined) left.current ??= float.current;
      if (float.current !== undefined) float.current += delta * (motion.speed ?? 1);
      if (float.current !== undefined && left.current !== undefined && float.current - left.current >= NOTE_LIFE)
        float.current = left.current = undefined;
    }
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
    // each ♪ rises and drifts off to the right, turning a little, fading in quickly and out slowly,
    // then sets off again from the piano (unless it would set off after the pointer has gone)
    NOTES.forEach((note, i) => {
      const sprite = notes.current[i];
      if (!sprite) return;
      const since = float.current === undefined ? -1 : float.current - note.delay;
      const set = note.delay + Math.floor(since / NOTE_LIFE) * NOTE_LIFE;
      sprite.visible = since >= 0 && (left.current === undefined || set < left.current);
      if (!sprite.visible) return;
      const k = (since % NOTE_LIFE) / NOTE_LIFE;
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
