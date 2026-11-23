"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import type { MotionProps } from "./cycle";

export function useStill(): boolean {
  return useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
}

export function usePointer() {
  const [pointing, setPointing] = useState(false);
  const on = useRef(false);
  const leaving = useRef<ReturnType<typeof setTimeout>>(undefined);
  const bind = useMemo(() => {
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
