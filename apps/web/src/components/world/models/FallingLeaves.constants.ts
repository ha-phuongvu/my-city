// The fixed numbers FallingLeaves.tsx works with: the map's view, the shape of a leaf's fall and how many leaves.

import { Matrix4, Quaternion, Vector3 } from "three";

// the map's ground in the prototype's units, and the camera's direction (VIEW)
export const GROUND = 0.15;
export const VIEW = [1, 1, 1];
export const PICTURE = Math.sqrt(2 / 3);
// the screen's right, its up, and toward the camera, on the map
export const RIGHT = new Vector3(1, 0, -1).normalize();
export const UP = new Vector3(-1, 2, -1).normalize();
export const TOWARD = new Vector3(1, 1, 1).normalize();
export const FACING = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(RIGHT, UP, TOWARD));
// a leaf turns about the line through it toward the camera (its own z)
export const TOWARD_LEAF = new Vector3(0, 0, 1);

// the shares of its time at which a leaf's fall (leaf-fall) reaches each of its spots (FallingLeaves.tsx's fallAt)
export const FALL_AT = [0, 0.22, 0.42, 0.62, 0.8, 1];
// how many leaves can be falling at once, how many spots on a crown they come from, and when they're gone
export const LEAVES = 48;
export const SPOTS = 24;
export const GONE = 4.2;
export const SHAKE_EVERY = 0.5;
