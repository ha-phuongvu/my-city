import { Matrix4, Vector3 } from "three";
import { SignKind } from "../constants/signLayout.constants";

const G = 0.15;

export const TO_SITE = new Matrix4().set(1, 0, 0, 0, 0, 0, 1, -G, 0, 1, 0, 0, 0, 0, 0, 1);

type Card = { at: [number, number, number]; turn: number; width: number; height: number };

const CARDS = {
  scroll: { at: [0, -0.2, 0.15], turn: -22, width: 1.7, height: 2.3 },
  inkwell: { at: [1.35, -0.75, 0.15], turn: 0, width: 1, height: 1 },
  stand: { at: [0, 0, 0.15], turn: -22, width: 1.9, height: 2.3 },
  led: { at: [0, 0, 0.15], turn: 0, width: 2.4, height: 0.95 },
  board: { at: [0, 0, 0.15], turn: 0, width: 1.5, height: 1.9 },
  barricade: { at: [0, 0, 0.15], turn: -10, width: 2.3, height: 1.75 },
} satisfies Record<string, Card>;

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

export function signsAt(): SignAt[] {
  return [
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

    {
      kind: SignKind.Barricade,
      name: "Future city",
      sub: "Under construction",
      place: place(CARDS.barricade, 14.066, 13.6489, G + 0.02, -10),
    },
  ];
}
