// The fixed values season.ts works with: which months are which season. The season always comes from
// the visitor's date; there is no switch.

// the two seasons the world can be drawn in
export enum Season {
  Summer = "summer",
  Winter = "winter",
}

// every season, in the order their months are looked through
export const SEASONS: Season[] = [Season.Summer, Season.Winter];

// the months each season is shown (0 is January): summer April to June, winter October to December
export const SEASON_MONTHS: Record<Season, number[]> = {
  [Season.Summer]: [3, 4, 5],
  [Season.Winter]: [9, 10, 11],
};

// the season shown in the months that belong to neither
export const FALLBACK = Season.Summer;
