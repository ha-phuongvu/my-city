import { Matrix4, Vector3 } from "three";
import { SignKind } from "../constants/signLayout.constants";

// The cities' name signs and the future-city plot's barricade, where the prototype's map puts them
// (buildWorld: each city's sign SIGN_AT, grown 1.35 times with its city (CITY_GROW), from its middle,
// turned a little, and the barricade 2.7 in front of the plot), in the prototype's units; some are a
// different size from their cards.
//
// The prototype has x and y on the ground and z up, with the ground at 0.15; the site has x and z
// on the ground (its x the prototype's x, its z the prototype's y) and y up from the ground at 0.

const G = 0.15;

/** The prototype's map → the site's */
export const TO_SITE = new Matrix4().set(1, 0, 0, 0, 0, 0, 1, -G, 0, 1, 0, 0, 0, 0, 0, 1);

/** A sign as its card builds it: where it stands, its turn (degrees), width and height */
type Card = { at: [number, number, number]; turn: number; width: number; height: number };

const CARDS = {
  scroll: { at: [0, -0.2, 0.15], turn: -22, width: 1.7, height: 2.3 },
  inkwell: { at: [1.35, -0.75, 0.15], turn: 0, width: 1, height: 1 },
  stand: { at: [0, 0, 0.15], turn: -22, width: 1.9, height: 2.3 },
  led: { at: [0, 0, 0.15], turn: 0, width: 2.4, height: 0.95 },
  board: { at: [0, 0, 0.15], turn: 0, width: 1.5, height: 1.9 },
  barricade: { at: [0, 0, 0.15], turn: -10, width: 2.3, height: 1.75 },
} satisfies Record<string, Card>;

/**
 * From a sign's card to its place on the prototype's map: moved to (x, y, z), turned to `turn` and
 * stretched to the map's width and height. The stretch is across the sign and up it, not front to
 * back, as the prototype's sign builders only widen and heighten the board.
 */
function cardToMap(
  card: Card,
  x: number,
  y: number,
  z: number,
  turn: number,
  width: number,
  height: number,
): Matrix4 {
  const a = ((45 + card.turn) * Math.PI) / 180;
  const front = new Vector3(Math.cos(a), Math.sin(a), 0);
  const across = new Vector3(front.y, -front.x, 0);
  const frame = new Matrix4().makeBasis(across, front, new Vector3(0, 0, 1));
  const stretch = new Matrix4()
    .copy(frame)
    .multiply(new Matrix4().makeScale(width / card.width, 1, height / card.height))
    .multiply(new Matrix4().copy(frame).transpose());
  return new Matrix4()
    .makeTranslation(x, y, z)
    .multiply(new Matrix4().makeRotationZ(((turn - card.turn) * Math.PI) / 180))
    .multiply(stretch)
    .multiply(new Matrix4().makeTranslation(-card.at[0], -card.at[1], -card.at[2]));
}

/** From a sign's card to the site's map */
const place = (
  card: Card,
  x: number,
  y: number,
  z: number,
  turn: number,
  width = card.width,
  height = card.height,
) => new Matrix4().copy(TO_SITE).multiply(cardToMap(card, x, y, z, turn, width, height));

export type SignAt =
  | { kind: SignKind.Scroll; name: string; sub: string; place: Matrix4; inkPlace: Matrix4 }
  | {
      kind: SignKind.Stand | SignKind.Led | SignKind.Board;
      name: string;
      sub: string;
      later: boolean;
      place: Matrix4;
    }
  | { kind: SignKind.Barricade; name: string; sub: string; place: Matrix4 };

/** Every sign on the map, where the prototype puts it (its map's x and y, its turn, width and height) */
export function signsAt(): SignAt[] {
  return [
    // Story City's scroll, and the inkwell on the lawn below its quill, the inkwell's own size
    {
      kind: SignKind.Scroll,
      name: "Story City",
      sub: "Open now",
      place: place(CARDS.scroll, -10.0886, -6.8431, G, -22, 2.0, 2.7),
      inkPlace: place(CARDS.inkwell, -9.028, -7.833, G + 0.035, 0),
    },
    {
      kind: SignKind.Stand,
      name: "Music City",
      sub: "Open now",
      later: false,
      place: place(CARDS.stand, -12.3805, -31.0163, G, 22),
    },
    {
      kind: SignKind.Board,
      name: "Movie City",
      sub: "Opens later",
      later: true,
      place: place(CARDS.board, 27.3892, 0.6094, G, -22, 1.8, 2.2),
    },
    {
      kind: SignKind.Led,
      name: "Game City",
      sub: "Opens later",
      later: true,
      place: place(CARDS.led, -23.2145, 24.4616, G, -22, 2.6, 1.05),
    },
    // (Comic City's name is on its theatre's title card, so it has no sign)
    {
      kind: SignKind.Barricade,
      name: "Future city",
      sub: "Under construction",
      place: place(CARDS.barricade, 14.066, 13.6489, G + 0.02, -10),
    },
  ];
}
