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
 * Pointing at a model on the map, as the prototype's pointerover: `pointing` stays true while the
 * pointer is on it. Put `bind` on the model's group. The pointer moving from one piece of the model
 * to the next leaves one and enters the other, so it only counts as leaving if it doesn't come back
 * straight away; and while a button is held the map is being dragged, which doesn't count.
 */
export function usePointer() {
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
  return { pointing, bind };
}

/**
 * A motion `length` seconds long that plays over and over for as long as the model is pointed at,
 * resting `again` seconds between rounds; once the pointer has gone it finishes the round it's on
 * and comes to rest (so nothing is left halfway, a page in the air or a door half shut). Returns
 * the time into the round, or undefined while it's at rest; `at` holds it at that share of the
 * round instead. Read it inside useFrame.
 */
export function usePlayWhilePointed(
  length: number,
  { speed = 1, at, pointing = false }: MotionProps,
  again = 0,
): () => number | undefined {
  const time = useRef<number | undefined>(undefined);
  useFrame((_, delta) => {
    if (time.current !== undefined) {
      time.current += delta * speed;
      if (time.current >= length && !pointing) time.current = undefined;
      else if (time.current >= length + again) time.current -= length + again;
    }
    if (pointing && time.current === undefined) time.current = 0;
  });
  return () => {
    if (at !== undefined) return at * length;
    return time.current !== undefined && time.current < length ? time.current : undefined;
  };
}
