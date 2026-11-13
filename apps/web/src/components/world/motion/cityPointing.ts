"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useMemo, useSyncExternalStore } from "react";
import type { City } from "../layout";

// Pointing at a city (anywhere on its walled lawn, its floating model or its sign) starts everything in
// it at once, as the prototype's playCity: the model's motion, its sign's, and Music City's flower beds
// growing. It plays once each time the pointer comes into the city: moving about inside it (from the
// lawn onto the model) doesn't count again, and nothing starts while the map is being dragged.

export type CityId = City["id"];

let current: CityId | null = null;
let leaving: ReturnType<typeof setTimeout> | undefined;
const pokes: Partial<Record<CityId, number>> = {};
const listeners = new Set<() => void>();

function tell() {
  for (const listener of listeners) listener();
}

function enter(city: CityId) {
  clearTimeout(leaving);
  if (city === current) return;
  current = city;
  pokes[city] = (pokes[city] ?? 0) + 1;
  tell();
}

// (the pointer moving from one piece of the city to the next leaves one and enters the other, so it
// only counts as leaving if it doesn't come back straight away)
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

/** Goes up by one each time the pointer comes into the city: pass it on as a model's `poke` */
export function useCityPoke(city: CityId): number {
  return useSyncExternalStore(
    subscribe,
    () => pokes[city] ?? 0,
    () => 0,
  );
}

/** Whether the pointer is in the city now, for motions that go on while it stays (Game City's LED board) */
export function useInCity(city: CityId): boolean {
  return useSyncExternalStore(
    subscribe,
    () => current === city,
    () => false,
  );
}

/** Handlers for anything that counts as the city (its lawn, its model, its sign): spread them on its group or mesh */
export function useCityHit(city: CityId) {
  return useMemo(() => {
    // (moving counts too: the pointer may have come onto it while dragging, and then let go there)
    const over = (event: ThreeEvent<PointerEvent>) => {
      if (event.buttons) return;
      enter(city);
    };
    return { onPointerOver: over, onPointerMove: over, onPointerOut: leave };
  }, [city]);
}
