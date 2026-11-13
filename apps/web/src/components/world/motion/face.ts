import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  type Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Texture,
} from "three";
import { withRoomLight } from "../roomLight";

// The words and pictures painted on a sign's board. The prototype lays them over its map as a page
// element on the board's face (its face: the top left, top right and bottom left corners, and its
// width and height, in map units); here they are drawn on a canvas and laid on that face as a thin
// sheet just in front of the board, in the prototype's units.

type Point = readonly [number, number, number];

/** A sheet over a face: `at(s, t)` is its point s of the way across (left to right) and t down */
export function faceSheet(at: (s: number, t: number) => Point, columns = 1, rows = 1): BufferGeometry {
  const position: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= columns; c++) {
      position.push(...at(c / columns, r / rows));
      uv.push(c / columns, 1 - r / rows);
      const v = r * (columns + 1) + c;
      if (r < rows && c < columns) index.push(v, v + columns + 1, v + 1, v + 1, v + columns + 1, v + columns + 2);
    }
  }
  const sheet = new BufferGeometry();
  sheet.setAttribute("position", new BufferAttribute(new Float32Array(position), 3));
  sheet.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  sheet.setIndex(index);
  sheet.computeVertexNormals();
  return sheet;
}

/** A flat face from its top left, top right and bottom left corners, lifted `lift` toward the viewer along `out` */
export function flatSheet([tl, tr, bl]: readonly Point[], out: Point = [0, 0, 0], lift = 0): BufferGeometry {
  return faceSheet((s, t) => [
    tl[0] + (tr[0] - tl[0]) * s + (bl[0] - tl[0]) * t + out[0] * lift,
    tl[1] + (tr[1] - tl[1]) * s + (bl[1] - tl[1]) * t + out[1] * lift,
    tl[2] + (tr[2] - tl[2]) * s + (bl[2] - tl[2]) * t + out[2] * lift,
  ]);
}

/** A canvas for a face `width` × `height` map units, `k` pixels to the unit */
export type Canvas = {
  context: CanvasRenderingContext2D;
  texture: CanvasTexture;
  k: number;
  width: number;
  height: number;
};

export function faceCanvas(width: number, height: number, k = 360): Canvas {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * k);
  canvas.height = Math.round(height * k);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no 2D canvas");
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return { context, texture, k, width, height };
}

/**
 * The face's look: lit like the models (the room light too) when given the light, or unlit, as a
 * screen glows. Drawn over the board where they touch.
 */
export function faceMaterial(map: Texture, light?: Texture): Material {
  const options = {
    map,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  };
  if (!light) return new MeshBasicMaterial({ ...options, toneMapped: false });
  return withRoomLight(new MeshStandardMaterial({ ...options, roughness: 1, metalness: 0 }), light);
}

/** A line of words, sized in map units as the prototype's page sizes them */
export type Words = {
  text: string;
  size: number;
  font: string;
  weight?: number | string;
  style?: string;
  color: string;
  /** letter spacing, in ems */
  spacing?: number;
  opacity?: number;
  /** a soft glow round the letters (the page's text-shadow): its colour and spread in map units */
  glow?: { color: string; blur: number };
};

function setFont(canvas: Canvas, words: Words) {
  const { context, k } = canvas;
  context.font = `${words.style ?? "normal"} ${words.weight ?? 400} ${words.size * k}px ${words.font}`;
  context.letterSpacing = `${(words.spacing ?? 0) * words.size * k}px`;
}

/** How wide a line of words is, in map units */
export function wordsWidth(canvas: Canvas, words: Words): number {
  setFont(canvas, words);
  return canvas.context.measureText(words.text).width / canvas.k;
}

/** Draws a line of words with the middle of its line at y, starting at x (or centred on it) */
export function drawWords(canvas: Canvas, words: Words, x: number, y: number, align: "left" | "center" = "center") {
  const { context, k } = canvas;
  context.save();
  setFont(canvas, words);
  context.textAlign = align;
  context.textBaseline = "middle";
  context.globalAlpha = words.opacity ?? 1;
  context.fillStyle = words.color;
  if (words.glow) {
    context.shadowColor = words.glow.color;
    context.shadowBlur = words.glow.blur * k;
  }
  context.fillText(words.text, x * k, y * k);
  context.restore();
}
