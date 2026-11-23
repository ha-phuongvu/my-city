import { BufferAttribute, BufferGeometry, CanvasTexture, Points, PointsMaterial } from "three";
import { COVER, FLAKE_PICTURE, SWAY_SPEED } from "../constants/snowCover.constants";

let picture: CanvasTexture | null = null;

function flakePicture() {
  if (picture) return picture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = FLAKE_PICTURE;
  const c = canvas.getContext("2d");
  if (c) {
    const half = FLAKE_PICTURE / 2;
    const g = c.createRadialGradient(half, half, 0, half, half, half);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.55, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, FLAKE_PICTURE, FLAKE_PICTURE);
  }
  picture = new CanvasTexture(canvas);
  return picture;
}

export const eased = (k: number) => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k));

export class Cover {
  amount = 1;
  running = false;

  start() {
    if (this.running) return;
    this.running = true;
    this.amount = 0;
  }

  step(delta: number) {
    if (!this.running) return false;
    this.amount = Math.min(1, this.amount + delta / COVER.cover);
    if (this.amount >= 1) this.running = false;
    return true;
  }

  get white() {
    return eased(this.amount);
  }
}

export class Flakes {
  readonly points: Points;
  private seeds: [number, number, number, number][];

  constructor(
    spot: () => [number, number],
    private base: number,
  ) {
    this.seeds = Array.from({ length: COVER.flakes }, () => [
      ...spot(),
      Math.random(),
      0.7 + Math.random() * 0.6,
    ]);
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(COVER.flakes * 3), 3));
    this.points = new Points(
      g,
      new PointsMaterial({
        color: 0xffffff,
        size: COVER.size,
        map: flakePicture(),
        transparent: true,
        depthWrite: false,
      }),
    );
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.points.userData.noWave = true;
  }

  fall(t: number, on: boolean) {
    this.points.visible = on;
    if (!on) return;
    const P = this.points.geometry.attributes.position as BufferAttribute;
    this.seeds.forEach(([x, z, phase, speed], i) => {
      const k = (t / (COVER.fall * speed) + phase) % 1;
      const sway = COVER.sway * Math.sin(t * SWAY_SPEED + i);
      P.setXYZ(i, x + sway, this.base + COVER.high * (1 - k), z - sway);
    });
    P.needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    (this.points.material as PointsMaterial).dispose();
  }
}

export function inOval(cx: number, cz: number, rx: number, rz: number): () => [number, number] {
  return () => {
    const r = Math.sqrt(Math.random());
    const a = Math.random() * Math.PI * 2;
    return [cx + rx * 0.95 * r * Math.cos(a), cz + rz * 0.95 * r * Math.sin(a)];
  };
}
