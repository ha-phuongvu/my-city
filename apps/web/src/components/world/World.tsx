"use client";

import dynamic from "next/dynamic";

// three.js only runs in the browser and is a large download, so it loads after the page
const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false });

/** The 3D world, filling whatever holds it. */
export function World({ label }: { label: string }) {
  return <WorldCanvas label={label} />;
}
