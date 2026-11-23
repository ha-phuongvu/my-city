import { FALLBACK, Season, SEASON_MONTHS, SEASONS } from "../constants/season.constants";

let season: Season = FALLBACK;

export function seasonNow(now = new Date()): Season {
  const month = now.getMonth();
  return SEASONS.find((s) => SEASON_MONTHS[s].includes(month)) ?? FALLBACK;
}

export function setSeason(chosen: Season) {
  season = chosen;
}

export const isWinter = () => season === Season.Winter;

export const bySeason = <T>(summer: T, winter: T): T =>
  season === Season.Winter ? winter : summer;
