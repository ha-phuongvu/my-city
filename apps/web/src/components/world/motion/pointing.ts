"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import type { MotionProps } from "./cycle";

/** Whether the visitor has asked for less motion; then nothing plays and the models stay at rest */
export function useStill(): boolean {
  return useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
}

/**
 * Pointing at a model on the map, as the prototype's pointerover: `poke` goes up each time the
 * pointer comes onto it and `pointing` stays true while it's there. Put `bind` on the model's
 * group. The pointer moving from one piece of the model to the next leaves one and enters the
 * other, so it only counts as leaving if it doesn't come back straight away; and while a button is
 * held the map is being dragged, which doesn't count.
 */
export function usePointer() {
  const [poke, setPoke] = useState(0);
  const [pointing, setPointing] = useState(false);
  const on = useRef(false);
  const leaving = useRef<ReturnType<typeof setTimeout>>(undefined);
  const bind = useMemo(() => {
    // (moving counts too: the pointer may have come onto it while dragging, and then let go there)
    const over = (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      clearTimeout(leaving.current);
      if (on.current || event.buttons) return;
      on.current = true;
      setPointing(true);
      setPoke((n) => n + 1);
    };
    return {
      onPointerOver: over,
      onPointerMove: over,
      onPointerOut: () => {
        clearTimeout(leaving.current);
        leaving.current = setTimeout(() => {
          on.current = false;
          setPointing(false);
        }, 80);
      },
    };
  }, []);
  return { poke, pointing, bind };
}

/**
 * A motion that plays once, `length` seconds long, each time the model is pointed at, but not
 * again until it has finished (as the prototype's signs: pointing at one already playing does
 * nothing). Returns the time into the play, or undefined while it's at rest; `at` holds it at that
 * share of the play instead. Read it inside useFrame.
 */
export function usePlayOnPoke(length: number, { speed = 1, at, poke = 0 }: MotionProps): () => number | undefined {
  const time = useRef<number | undefined>(undefined);
  const seen = useRef(poke);
  useFrame((_, delta) => {
    if (time.current !== undefined) {
      time.current += delta * speed;
      if (time.current >= length) time.current = undefined;
    }
    if (poke !== seen.current) {
      seen.current = poke;
      if (time.current === undefined) time.current = 0;
    }
  });
  return () => (at === undefined ? time.current : at * length);
}
