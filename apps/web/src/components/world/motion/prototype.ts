import { Matrix4, type Object3D, Vector3 } from "three";

// The animated models are the prototype's shapes, so their motion is worked out in the prototype's
// own units and directions, with its own numbers (a door's hinge, the ball's path, the flag's wave).
// Each such GLB says how its shapes were placed (its scene's extras, "prototype"): mirrored, as the
// prototype's picture is a mirror image of a 3D view, turned `yaw` degrees about the up axis, and
// moved by `offset` so the middle of its base sits at the origin. The prototype has z up; glTF y.

export type PrototypeFrame = { yaw: number; offset: [number, number, number] };

/** The matrix taking a point in the prototype's units to the same point in the model */
export function prototypeMatrix({ yaw, offset }: PrototypeFrame): Matrix4 {
  const mirror = new Matrix4().makeScale(-1, 1, 1);
  const turn = new Matrix4().makeRotationZ((yaw * Math.PI) / 180);
  const move = new Matrix4().makeTranslation(-offset[0], -offset[1], -offset[2]);
  const yUp = new Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1);
  return yUp.multiply(move).multiply(turn).multiply(mirror);
}

/** The prototype frame a model's GLB carries, if it has one */
export function frameOf(scene: Object3D): PrototypeFrame | undefined {
  const frame = scene.userData.prototype as PrototypeFrame | undefined;
  return frame && Array.isArray(frame.offset) ? frame : undefined;
}

/**
 * Moves one part of a model by a motion given in the prototype's units (a turn about a hinge, a
 * slide along a path). The part's own shape is already where the prototype built it, so the motion
 * is carried into the model's frame and back: model ← prototype ← motion ← prototype ← model.
 */
export function moveInPrototype(part: Object3D, toModel: Matrix4, motion: Matrix4) {
  part.matrixAutoUpdate = false;
  part.matrix.copy(toModel).multiply(motion).multiply(new Matrix4().copy(toModel).invert());
  part.matrixWorldNeedsUpdate = true;
}

/** A turn of `degrees` about the line through `pivot` along `axis`, all in the prototype's units */
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
