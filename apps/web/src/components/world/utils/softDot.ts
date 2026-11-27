import { CanvasTexture } from "three";

export function softDot(
  size: number,
  stops: readonly (readonly [number, string])[],
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const half = size / 2;
    const gradient = context.createRadialGradient(half, half, 0, half, half, half);
    for (const [at, color] of stops) gradient.addColorStop(at, color);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}
