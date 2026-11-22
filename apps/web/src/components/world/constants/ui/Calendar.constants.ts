// The fixed values Calendar.tsx works with: how dates are written in each language, and how often it
// looks for a new day.

import { Language } from "@/i18n/language";

// the date written as each of the site's languages writes it
export const DATE_LOCALES: Record<Language, string> = {
  [Language.English]: "en-GB",
  [Language.Vietnamese]: "vi-VN",
};

// how often it checks whether it's a new day, so yesterday's page tears off (ms), and how long the torn
// page takes to fall away
export const CHECK_EVERY = 60_000;
export const TEAR_MS = 1100;

// In winter snow lies along the top of the calendar, a few drips over the edge of its binding (an SVG
// 128 by 17): the snow, its sunlit tops and its shadowed drips
export const SNOW_CAP = {
  snow: "M2 11 Q4 5 10 6 Q15 2 22 5 Q27 3 31 6 Q35 7 37 5 Q40 2 45 5 Q52 1 60 4 Q67 2 74 5 Q80 2 85 6 Q89 7 91 5 Q95 2 101 5 Q108 1 115 5 Q122 3 126 9 Q127 12 124 12 Q119 11 116 13 Q114 16.5 111.5 13.5 Q106 12 100 13 Q96 12.5 90 13 Q87 15.5 84.5 13 Q78 12 70 13 Q64 12 57 13 Q53 16 50 13 Q44 12 37 13 Q31 12 24 13 Q20 15 17.5 12.8 Q11 12 5 13 Q1 13 2 11 Z",
  lit: "M8 7 Q16 4 24 6 M66 4 Q76 3 84 6 M104 4 Q112 3 120 6",
  shade:
    "M5 12.4 Q11 11.4 17.5 12.2 M24 12.4 Q31 11.4 37 12.4 M57 12.4 Q64 11.4 70 12.4 M100 12.4 Q106 11.4 111 12.6",
  colors: { snow: "#fbfdff", lit: "#ffffff", shade: "#cfdbe8" },
} as const;
