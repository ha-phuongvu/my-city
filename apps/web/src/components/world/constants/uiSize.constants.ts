// How big the record player and the calendar are: as big as the screen has room for, full size on a
// wide screen and smaller on a narrower one (`small` wide is `least`, `full` wide is 1), and on a low
// screen small enough that the two of them, one over the other (`pile` high at full size, with the gap
// under the player), take no more of its height than `tall`. The month opened from the calendar (`month`
// big with six weeks, under the calendar `cal` high) stays its own size unless the screen is too low or
// narrow for it; `edge` is the room it keeps from the screen's edges, and `smallest` the least it shrinks to
export const UI_SIZE = {
  small: 300,
  full: 1100,
  least: 0.62,
  pile: 384,
  tall: 0.84,
  cal: 144,
  month: [238, 304],
  edge: 24,
  smallest: 0.5,
} as const;
// the CSS variables the record player's and the calendar's styles read their size from
export const UI_VAR = "--ui";
export const UI_MONTH_VAR = "--ui-month";
