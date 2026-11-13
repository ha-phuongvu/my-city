// The fixed values Model.tsx works with: where the Draco decoders are and which way is up.

import { Vector3 } from "three";

// Decoders copied into public/draco by scripts/copy-draco.mjs, for Draco-compressed models
export const DRACO = "/draco/";

export const UP = new Vector3(0, 1, 0);
