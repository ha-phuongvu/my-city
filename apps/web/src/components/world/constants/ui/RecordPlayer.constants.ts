// The fixed values RecordPlayer.tsx works with: the songs it plays and how its turntable moves.

export type Song = {
  title: string;
  /** who wrote or sings it, shown under the title */
  by?: string;
  /** the sound file, e.g. "/music/one-summers-day.mp3" (put the file in public/music) */
  src: string;
};

// what the player is doing
export enum PlayState {
  Stopped = "stopped",
  Playing = "playing",
  Paused = "paused",
}

// The playlist, played in turn and round again after the last. Empty for now: add a song here, and
// its file under public/music, and the player plays it. (Until then it shows that there are no songs.)
export const PLAYLIST: Song[] = [];

// The turntable: how fast the record turns playing (degrees a second: 33⅓ turns a minute), how quickly
// it gets up to speed and slows (s); the tonearm's angles (degrees round its pivot): off the record, on
// its outer groove and at its last groove by the label; how long the arm takes to swing over (s)
export const DECK = {
  spin: 200,
  spinUp: 0.6,
  spinDown: 1.4,
  arm: { off: -30, start: -12, end: 3 },
  swing: 0.55,
};

// going back from more than this far into a song (s) starts the song again instead
export const BACK = 3;
