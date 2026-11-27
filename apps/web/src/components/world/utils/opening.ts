import { useSyncExternalStore } from "react";

let on = true;
const listeners = new Set<() => void>();

export function setOpening(value: boolean) {
  if (on === value) return;
  on = value;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useOpening(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => on,
    () => true,
  );
}
