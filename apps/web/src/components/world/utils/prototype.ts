import { Matrix4, type Object3D, Vector3 } from "three";

export type PrototypeFrame = { yaw: number; offset: [number, number, number] };

export function prototypeMatrix({ yaw, offset }: PrototypeFrame): Matrix4 {
  const mirror = new Matrix4().makeScale(-1, 1, 1);
  const turn = new Matrix4().makeRotationZ((yaw * Math.PI) / 180);
  const move = new Matrix4().makeTranslation(-offset[0], -offset[1], -offset[2]);
  const yUp = new Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1);
  return yUp.multiply(move).multiply(turn).multiply(mirror);
}

export function frameOf(scene: Object3D): PrototypeFrame | undefined {
  const frame = scene.userData.prototype as PrototypeFrame | undefined;
  return frame && Array.isArray(frame.offset) ? frame : undefined;
}

export function moveInPrototype(part: Object3D, toModel: Matrix4, motion: Matrix4) {
  part.matrixAutoUpdate = false;
  part.matrix.copy(toModel).multiply(motion).multiply(new Matrix4().copy(toModel).invert());
  part.matrixWorldNeedsUpdate = true;
}

export function turnAbout(
  pivot: readonly number[],
  axis: readonly number[],
  degrees: number,
  out = new Matrix4(),
): Matrix4 {
  const spin = new Matrix4().makeRotationAxis(
    new Vector3(axis[0], axis[1], axis[2]).normalize(),
    (degrees * Math.PI) / 180,
  );
  return out
    .makeTranslation(pivot[0], pivot[1], pivot[2])
    .multiply(spin)
    .multiply(new Matrix4().makeTranslation(-pivot[0], -pivot[1], -pivot[2]));
}
