"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useMemo, useSyncExternalStore } from "react";
import type { CityId } from "../constants/layout.constants";

let current: CityId | null = null;
let leaving: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function tell() {
  for (const listener of listeners) listener();
}

function enter(city: CityId) {
  clearTimeout(leaving);
  if (city === current) return;
  current = city;
  tell();
}

function leave() {
  clearTimeout(leaving);
  leaving = setTimeout(() => {
    current = null;
    tell();
  }, 80);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useInCity(city: CityId): boolean {
  return useSyncExternalStore(
    subscribe,
    () => current === city,
    () => false,
  );
}

export function useCityHit(city: CityId) {
  return useMemo(() => {
    const over = (event: ThreeEvent<PointerEvent>) => {
      if (event.buttons) return;
      enter(city);
    };
    return { onPointerOver: over, onPointerMove: over, onPointerOut: leave };
  }, [city]);
}
