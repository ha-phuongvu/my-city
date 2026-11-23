"use client";

import dynamic from "next/dynamic";
import type { OpeningWords } from "../opening/Opening";
import type { FrameWords } from "./WorldCanvas";
import { seasonNow, setSeason } from "../utils/season";

const WorldCanvas = dynamic(
  () => {
    setSeason(seasonNow());
    return import("./WorldCanvas");
  },
  { ssr: false },
);

export function World({
  label,
  opening,
  frame,
}: {
  label: string;
  opening: OpeningWords;
  frame: FrameWords;
}) {
  return <WorldCanvas label={label} opening={opening} frame={frame} />;
}
