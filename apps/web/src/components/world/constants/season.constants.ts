// The fixed values season.ts works with: which months are which season, and where the testing switch keeps
// its choice.

// the two seasons the world can be drawn in (the value is what the testing switch keeps in the browser)
export enum Season {
  Summer = "summer",
  Winter = "winter",
}

// the seasons, in the order the testing switch shows them (SeasonSwitch.tsx)
export const SEASONS: Season[] = [Season.Summer, Season.Winter];

// the months each season is shown (0 is January): summer April to June, winter October to December
export const SEASON_MONTHS: Record<Season, number[]> = {
  [Season.Summer]: [3, 4, 5],
  [Season.Winter]: [9, 10, 11],
};

// the season shown in the months that belong to neither
export const FALLBACK = Season.Summer;

// in development, the season picked on the testing switch is kept in the browser under this name
export const PICKED_KEY = "my-city:season";
