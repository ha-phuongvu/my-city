import {
  FALLBACK,
  PICKED_KEY,
  Season,
  SEASON_MONTHS,
  SEASONS,
} from "../constants/season.constants";

// The world is drawn in one season, summer or winter, for the whole visit. It's chosen once in the
// browser, before the world's code loads (World.tsx), so the constants files can pick their summer
// or winter values as they load: by the visitor's date, or in development by the testing switch.

let season: Season = FALLBACK;

const testing = process.env.NODE_ENV === "development";

/** The season picked on the testing switch, if any (only in development) */
export function pickedSeason(): Season | null {
  if (!testing) return null;
  try {
    const picked = window.localStorage.getItem(PICKED_KEY);
    return SEASONS.find((s) => s === picked) ?? null;
  } catch {
    return null;
  }
}

/** Keeps the season picked on the testing switch (null forgets it) */
export function pickSeason(picked: Season | null) {
  try {
    if (picked) window.localStorage.setItem(PICKED_KEY, picked);
    else window.localStorage.removeItem(PICKED_KEY);
  } catch {
    // (storage may be off; the date decides then)
  }
}

/** The season it is where the visitor is, unless one was picked on the testing switch */
export function seasonNow(now = new Date()): Season {
  const month = now.getMonth();
  return pickedSeason() ?? SEASONS.find((s) => SEASON_MONTHS[s].includes(month)) ?? FALLBACK;
}

/** Sets the season; only before the world's code has loaded */
export function setSeason(chosen: Season) {
  season = chosen;
}

export const isWinter = () => season === Season.Winter;

/** The summer or the winter one of the two */
export const bySeason = <T>(summer: T, winter: T): T =>
  season === Season.Winter ? winter : summer;
