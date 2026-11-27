export function ease(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);
}

export const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export function smoothstep(from: number, to: number, x: number): number {
  const k = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return k * k * (3 - 2 * k);
}

export function bezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const along = (a: number, b: number, s: number) =>
    3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const s = (lo + hi) / 2;
      if (along(x1, x2, s) < x) lo = s;
      else hi = s;
    }
    return along(y1, y2, (lo + hi) / 2);
  };
}
