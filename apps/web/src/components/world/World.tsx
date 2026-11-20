"use client";

import dynamic from "next/dynamic";
import type { OpeningWords } from "./Opening";

// three.js only runs in the browser and is a large download, so it loads after the page
const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false });

/** The 3D world, filling whatever holds it. */
export function World({ label, opening }: { label: string; opening: OpeningWords }) {
  return <WorldCanvas label={label} opening={opening} />;
}
