"use client";

import dynamic from "next/dynamic";
import type { OpeningWords } from "../opening/Opening";
import type { FrameWords } from "./WorldCanvas";
import { SeasonSwitch } from "../ui/SeasonSwitch";
import { seasonNow, setSeason } from "../utils/season";

// three.js only runs in the browser and is a large download, so it loads after the page. The season
// is chosen just before, since the world's colours are picked as its code loads.
const WorldCanvas = dynamic(
  () => {
    setSeason(seasonNow());
    return import("./WorldCanvas");
  },
  { ssr: false },
);

/** The 3D world, filling whatever holds it. */
export function World({
  label,
  opening,
  frame,
}: {
  label: string;
  opening: OpeningWords;
  frame: FrameWords;
}) {
  return (
    <>
      <WorldCanvas label={label} opening={opening} frame={frame} />
      {process.env.NODE_ENV === "development" && <SeasonSwitch />}
    </>
  );
}
