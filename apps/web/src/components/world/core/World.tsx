"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { CREEP, FILES_TO } from "../constants/ui/Loading.constants";
import { Loading } from "../ui/Loading";
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
  loading,
  opening,
  frame,
}: {
  label: string;
  loading: string;
  opening: OpeningWords;
  frame: FrameWords;
}) {
  const [shown, setShown] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState(false);
  useEffect(() => {
    if (files || shown) return;
    const creep = setInterval(
      () => setProgress((p) => p + (CREEP.to - p) * CREEP.rate),
      CREEP.every,
    );
    return () => clearInterval(creep);
  }, [files, shown]);
  const onProgress = useCallback((share: number) => {
    setFiles(true);
    setProgress((p) => Math.max(p, CREEP.to + (FILES_TO - CREEP.to) * share));
  }, []);
  const onShown = useCallback(() => {
    setProgress(1);
    setShown(true);
  }, []);
  return (
    <>
      <WorldCanvas
        label={label}
        opening={opening}
        frame={frame}
        onProgress={onProgress}
        onShown={onShown}
      />
      <Loading label={loading} progress={progress} done={shown} />
    </>
  );
}
