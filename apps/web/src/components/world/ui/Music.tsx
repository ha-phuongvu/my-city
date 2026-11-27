"use client";

import dynamic from "next/dynamic";
import type { PlayerWords } from "./RecordPlayer";
import { useUiSize } from "../utils/uiSize";

const RecordPlayer = dynamic(() => import("./RecordPlayer"), { ssr: false });

export function Music({ words }: { words: PlayerWords }) {
  useUiSize();
  return <RecordPlayer words={words} />;
}
