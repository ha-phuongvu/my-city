"use client";

import { useSyncExternalStore } from "react";
import { type Season, SEASONS } from "../constants/season.constants";
import { pickSeason, seasonNow } from "../utils/season";

// For testing only (shown in development, never on the live site): a switch in the top-left corner between
// the summer and winter worlds. The pick is kept in the browser until changed (the date decides
// otherwise), and since the world's colours are picked as its code loads, switching reloads the page.

const noChange = () => () => {};

export function SeasonSwitch() {
  const current = useSyncExternalStore(
    noChange,
    () => seasonNow(),
    () => null,
  );
  if (!current) return null;
  const go = (season: Season) => {
    pickSeason(season);
    window.location.reload();
  };
  return (
    <div className="fixed top-3 left-3 z-50 flex gap-1 rounded-full bg-white/85 p-1 text-xs font-medium shadow">
      {SEASONS.map((season) => (
        <button
          key={season}
          type="button"
          aria-pressed={season === current}
          onClick={() => season !== current && go(season)}
          className={`rounded-full px-3 py-1 capitalize ${
            season === current ? "bg-slate-800 text-white" : "text-slate-700 hover:bg-slate-200"
          }`}
        >
          {season}
        </button>
      ))}
    </div>
  );
}
