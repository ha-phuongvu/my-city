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
import { TextAlign } from "../constants/face.constants";
import { withRoomLight } from "./roomLight";

type Point = readonly [number, number, number];

export function faceSheet(
  at: (s: number, t: number) => Point,
  columns = 1,
  rows = 1,
): BufferGeometry {
  const position: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= columns; c++) {
      position.push(...at(c / columns, r / rows));
      uv.push(c / columns, 1 - r / rows);
      const v = r * (columns + 1) + c;
      if (r < rows && c < columns)
        index.push(v, v + columns + 1, v + 1, v + 1, v + columns + 1, v + columns + 2);
    }
  }
  const sheet = new BufferGeometry();
  sheet.setAttribute("position", new BufferAttribute(new Float32Array(position), 3));
  sheet.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  sheet.setIndex(index);
  sheet.computeVertexNormals();
  return sheet;
}

export function flatSheet(
  [tl, tr, bl]: readonly Point[],
  out: Point = [0, 0, 0],
  lift = 0,
): BufferGeometry {
  return faceSheet((s, t) => [
    tl[0] + (tr[0] - tl[0]) * s + (bl[0] - tl[0]) * t + out[0] * lift,
    tl[1] + (tr[1] - tl[1]) * s + (bl[1] - tl[1]) * t + out[1] * lift,
    tl[2] + (tr[2] - tl[2]) * s + (bl[2] - tl[2]) * t + out[2] * lift,
  ]);
}

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

export type Words = {
  text: string;
  size: number;
  font: string;
  weight?: number | string;
  style?: string;
  color: string;

  spacing?: number;
  opacity?: number;

  glow?: { color: string; blur: number };
};

function setFont(canvas: Canvas, words: Words) {
  const { context, k } = canvas;
  context.font = `${words.style ?? "normal"} ${words.weight ?? 400} ${words.size * k}px ${words.font}`;
  context.letterSpacing = `${(words.spacing ?? 0) * words.size * k}px`;
}

export function wordsWidth(canvas: Canvas, words: Words): number {
  setFont(canvas, words);
  return canvas.context.measureText(words.text).width / canvas.k;
}

export function drawWords(
  canvas: Canvas,
  words: Words,
  x: number,
  y: number,
  align = TextAlign.Center,
) {
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
