// The fixed numbers Wildflowers.tsx works with: each flower's head and bud, and the keyframes it opens and closes by.

// Each head as wildflowerParts makes it, in the prototype's units: where it sits on its stem (the
// point it opens about), the way it faces (it twists about that), and its bud, which the card
// leaves out and the map shows under the head
export const HEADS = [
  { top: [-1.06568, -0.76621, 0.40342], axis: [0.43776, 0.43776, 0.78533], bud: { from: [-1.09868, -0.79921, 0.38542], size: [0.066, 0.066, 0.0825], color: "#86ba89" } },
  { top: [-0.17856, -1.09867, 0.46628], axis: [0.5069, 0.5069, 0.69721], bud: { from: [-0.21156, -1.13167, 0.44828], size: [0.066, 0.066, 0.0825], color: "#c5d997" } },
  { top: [-0.46626, 0.14743, 0.42563], axis: [0.26814, 0.26814, 0.92531], bud: { from: [-0.49926, 0.11443, 0.40763], size: [0.066, 0.066, 0.0825], color: "#acc58a" } },
  { top: [-0.92217, 0.78266, 0.5037], axis: [0.36006, 0.36006, 0.86064], bud: { from: [-0.95517, 0.74966, 0.4857], size: [0.066, 0.066, 0.0825], color: "#a79967" } },
  { top: [1.14372, -1.06194, 0.32497], axis: [0, 0, 1], bud: { from: [1.11672, -1.08894, 0.32497], size: [0.054, 0.054, 0.195], color: "#7d8f78" } },
  { top: [0.47042, -0.03384, 0.428], axis: [0.39851, 0.39851, 0.82606], bud: { from: [0.43742, -0.06684, 0.41], size: [0.066, 0.066, 0.0825], color: "#a8ad52" } },
  { top: [-0.02658, 0.75853, 0.53446], axis: [0.2676, 0.2676, 0.92563], bud: { from: [-0.05958, 0.72553, 0.51646], size: [0.066, 0.066, 0.0825], color: "#acc58a" } },
  { top: [0.91956, 0.68159, 0.50203], axis: [0.45794, 0.45794, 0.76196], bud: { from: [0.88656, 0.64859, 0.48403], size: [0.066, 0.066, 0.0825], color: "#76754b" } },
];

// the keyframes, as shares of the round: [when, size, twist in degrees, how solid]
export const BLOOM: [number, number, number, number][] = [
  [0, 0.15, -30, 0],
  [0.08, 0.15, -30, 0],
  [0.22, 1.1, 4, 1],
  [0.28, 1, 0, 1],
  [0.76, 1, 0, 1],
  [0.9, 0.15, -30, 0],
  [1, 0.15, -30, 0],
];
