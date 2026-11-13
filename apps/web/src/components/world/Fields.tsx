"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  CylinderGeometry,
  InstancedBufferAttribute,
  type InstancedMesh,
  type Material,
  Matrix4,
  type Mesh,
  type MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import { FLOWER_PATCHES, type FlowerPatch } from "./fieldLayout";
import { CUT, FLOWER, FLOWERS, GROW, LEAF, PINK_SHADE, STAGES, WHITE } from "./Fields.constants";
import { useModelSize } from "./Model";
import { through } from "./motion/cycle";
import { useRoomLight, withRoomLight } from "./roomLight";

// The field flowers growing wild in the grass, in patches where the prototype's world map has its
// spaces for flowers (fieldLayout.ts): one big patch with two small ones beside it in each.

/** "cut" just after it is cut back, then how far grown, from 0 (bare stems) to 1 (in full flower) */
type Stage = "cut" | number;

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const toHex = (c: Rgb) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
/** The colour k of the way from a to b, mixed as the prototype mixes its colours (its tint) */
const tint = (a: string, b: string, k: number) => {
  const p = rgb(a);
  const q = rgb(b);
  return toHex(p.map((v, i) => v + (q[i] - v) * k) as Rgb);
};

// when each patch was last pointed at, on the canvas clock
const started = new Map<FlowerPatch, number>();

function startGrowing(patch: FlowerPatch, now: number) {
  const start = started.get(patch);
  if (start === undefined || now - start >= GROW) started.set(patch, now);
}

function stageOf(patch: FlowerPatch, now: number): Stage {
  const start = started.get(patch);
  if (start === undefined || now - start >= GROW) return 1;
  const t = now - start;
  return t < CUT ? "cut" : through(STAGES, (t - CUT) / (GROW - CUT));
}

const unitDisc = new CylinderGeometry(1, 1, 1, 24);

/** Where pointing at a patch of flowers (or tapping it) starts it growing: an oval a little bigger than the patch, and the air over it (unseen) */
function GrowHits() {
  const clock = useThree((state) => state.clock);
  const hit = (patch: FlowerPatch) => () => startGrowing(patch, clock.elapsedTime);
  return FLOWER_PATCHES.map((patch, i) => (
    <mesh
      key={i}
      position={[patch.center[0], 0.3, patch.center[1]]}
      scale={[patch.radius[0] * 1.1, 0.6, patch.radius[1] * 1.1]}
      geometry={unitDisc}
      onPointerOver={hit(patch)}
      onPointerDown={hit(patch)}
    >
      <meshBasicMaterial colorWrite={false} depthWrite={false} />
    </mesh>
  ));
}

/** Where pointing at the patches of flowers grows them. It needs no models, so it works at once. */
export function Fields() {
  return <GrowHits />;
}

/** The colour that, multiplying the plant model's own colours, turns `ripe` into `color` */
function multiplier(color: string, ripe: string): Color {
  const want = new Color(color);
  const have = new Color(ripe);
  return new Color(Math.min(1, want.r / have.r), Math.min(1, want.g / have.g), Math.min(1, want.b / have.b));
}

type Look = { tall: number; wide: number; tint: Color };

/**
 * How a field flower stands at `stage` (fieldFlower): cut back to its leaves, it spreads them, puts
 * up its stem, and its bud swells from green to the petals' colour and opens, each flower a little
 * after or before the next (`late`, 0 to 1)
 */
function flowerAt(stage: Stage, petals: string, late: number): Look {
  const k = stage === "cut" ? 0 : stage;
  if (k >= 1) return { tall: 1, wide: 1, tint: WHITE };
  const leaves = Math.min(1, 0.3 + 1.4 * k);
  const stem = Math.min(1, Math.max(0, (k - 0.4) / 0.2));
  const swell = Math.min(1, Math.max(0, (k - 0.45) / 0.12));
  const open = Math.min(1, Math.max(0, (k - 0.55 - 0.15 * late) / 0.3));
  return {
    tall: Math.max(0.35 * leaves, stem),
    wide: 0.5 + 0.5 * leaves,
    tint: multiplier(tint(LEAF, petals, 0.25 + 0.5 * swell), petals).lerp(WHITE, open),
  };
}

// The flower model's petals are pink; a flower in a white or yellow drift has them painted its own
// colour, keeping their light and shade. Pink is told from the model's greens, its yellow middles
// and its browns by being much redder than green, with about as much blue as green.
function petalColors(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 petals;\nvarying vec3 vPetals;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPetals = petals;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vPetals;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        vec3 seen = sqrt(diffuseColor.rgb);
        float pink = smoothstep(0.25, 0.4, seen.r - seen.g) * smoothstep(-0.15, 0.0, seen.b - seen.g);
        float shade = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)) / ${PINK_SHADE.toFixed(2)};
        diffuseColor.rgb = mix(diffuseColor.rgb, vPetals * shade, pink);`,
      );
  };
  material.customProgramCacheKey = () => "petals";
}

type Part = { mesh: Mesh; local: Matrix4 };

/**
 * The field flowers growing wild in their patches, one draw call per part of the flower model. A
 * growing patch's flowers are rewritten every frame while it grows: their size, and their tint.
 */
export function FieldPlants() {
  const { scene } = useGLTF(FLOWER, "/draco/");
  const modelHeight = useModelSize(FLOWER).y;
  const light = useRoomLight();
  const refs = useRef<(InstancedMesh | null)[]>([]);
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const found: Part[] = [];
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh && !Array.isArray(mesh.material)) found.push({ mesh, local: object.matrixWorld });
    });
    return found;
  }, [scene]);
  // a flower's petal colour is one more thing each one carries
  const shapes = useMemo(
    () =>
      parts.map(({ mesh }) => {
        const shape = mesh.geometry.clone();
        const petals = new Float32Array(FLOWERS.length * 3);
        const color = new Color();
        FLOWERS.forEach((plant, i) => color.set(plant.petals).toArray(petals, i * 3));
        shape.setAttribute("petals", new InstancedBufferAttribute(petals, 3));
        return shape;
      }),
    [parts],
  );
  const materials = useMemo(
    () =>
      parts.map(({ mesh }) => {
        const material = withRoomLight(mesh.material as Material, light) as MeshStandardMaterial;
        petalColors(material);
        return material;
      }),
    [parts, light],
  );
  // which flowers belong to each patch, and the stage each was last drawn at
  const groups = useMemo(
    () => FLOWER_PATCHES.map((patch) => FLOWERS.flatMap((plant, i) => (plant.patch === patch ? [i] : []))),
    [],
  );
  const drawn = useRef<Stage[]>(FLOWER_PATCHES.map(() => -1));
  const write = useMemo(() => {
    const matrix = new Matrix4();
    const turn = new Quaternion();
    const position = new Vector3();
    const size = new Vector3();
    const up = new Vector3(0, 1, 0);
    return (members: number[], stage: Stage) => {
      parts.forEach(({ local }, p) => {
        const mesh = refs.current[p];
        if (!mesh) return;
        for (const i of members) {
          const plant = FLOWERS[i];
          const look = flowerAt(stage, plant.petals, plant.late);
          const scale = plant.height / modelHeight;
          turn.setFromAxisAngle(up, plant.turn);
          matrix
            .compose(position.set(plant.x, 0, plant.z), turn, size.set(scale * look.wide, scale * look.tall, scale * look.wide))
            .multiply(local);
          mesh.setMatrixAt(i, matrix);
          mesh.setColorAt(i, look.tint);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
      });
    };
  }, [parts, modelHeight]);
  useEffect(
    () => () => {
      materials.forEach((material) => material.dispose());
      shapes.forEach((shape) => shape.dispose());
    },
    [materials, shapes],
  );
  useFrame(({ clock }) => {
    FLOWER_PATCHES.forEach((patch, g) => {
      const stage = stageOf(patch, clock.elapsedTime);
      if (stage === drawn.current[g]) return;
      drawn.current[g] = stage;
      write(groups[g], stage);
    });
  });
  return parts.map(({ mesh }, p) => (
    <instancedMesh
      key={mesh.uuid}
      ref={(instanced) => {
        refs.current[p] = instanced;
      }}
      args={[shapes[p], materials[p], FLOWERS.length]}
      receiveShadow
    />
  ));
}
