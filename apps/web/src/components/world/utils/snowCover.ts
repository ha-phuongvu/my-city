import { BufferAttribute, BufferGeometry, CanvasTexture, Points, PointsMaterial } from "three";
import { COVER, FLAKE_PICTURE, SWAY_SPEED } from "../constants/snowCover.constants";
import { ease } from "./curves";
import { softDot } from "./softDot";

let picture: CanvasTexture | null = null;

function flakePicture() {
  picture ??= softDot(FLAKE_PICTURE, [
    [0, "rgba(255,255,255,1)"],
    [0.55, "rgba(255,255,255,0.9)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  return picture;
}

export class Cover {
  amount = 1;
  running = false;

  constructor(
    private length: number = COVER.cover,
    private wait = 0,
  ) {}

  start() {
    if (this.running) return;
    this.running = true;
    this.amount = -this.wait / this.length;
  }

  step(delta: number) {
    if (!this.running) return false;
    this.amount = Math.min(1, this.amount + delta / this.length);
    if (this.amount >= 1) this.running = false;
    return true;
  }

  get white() {
    return ease(this.amount);
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
