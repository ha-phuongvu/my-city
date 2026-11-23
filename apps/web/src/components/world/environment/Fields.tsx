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
import type { FlowerPatch } from "../constants/fieldLayout.constants";
import {
  AGAIN,
  CUT,
  CUT_BACK,
  FLOWER,
  FLOWERS,
  GROW,
  LEAF,
  PATCHES,
  PINK_SHADE,
  STAGES,
  WHITE,
} from "../constants/environment/Fields.constants";
import { useModelSize } from "../core/Model";
import { through } from "../utils/cycle";
import { useRoomLight, withRoomLight } from "../utils/roomLight";
import { isWinter } from "../utils/season";
import { SnowPiles } from "./SnowPiles";

type Stage = number;

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const toHex = (c: Rgb) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

const tint = (a: string, b: string, k: number) => {
  const p = rgb(a);
  const q = rgb(b);
  return toHex(p.map((v, i) => v + (q[i] - v) * k) as Rgb);
};

const started = new Map<FlowerPatch, number>();
const pointed = new Set<FlowerPatch>();
function startGrowing(patch: FlowerPatch, now: number) {
  if (!started.has(patch)) started.set(patch, now);
}

function stageOf(patch: FlowerPatch, now: number): Stage {
  const start = started.get(patch);
  if (start === undefined) return 1;
  let t = now - start;
  if (t >= GROW && !pointed.has(patch)) {
    started.delete(patch);
    return 1;
  }
  if (t >= GROW + AGAIN) {
    const rounds = Math.floor(t / (GROW + AGAIN));
    started.set(patch, start + rounds * (GROW + AGAIN));
    t -= rounds * (GROW + AGAIN);
  }
  if (t >= GROW) return 1;
  return t < CUT ? CUT_BACK : through(STAGES, (t - CUT) / (GROW - CUT));
}

const unitDisc = new CylinderGeometry(1, 1, 1, 24);

function GrowHits() {
  const clock = useThree((state) => state.clock);
  const tap = (patch: FlowerPatch) => () => startGrowing(patch, clock.elapsedTime);
  const over = (patch: FlowerPatch) => () => {
    pointed.add(patch);
    startGrowing(patch, clock.elapsedTime);
  };
  const out = (patch: FlowerPatch) => () => pointed.delete(patch);
  return PATCHES.map((patch, i) => (
    <mesh
      key={i}
      position={[patch.center[0], 0.3, patch.center[1]]}
      scale={[patch.radius[0] * 1.1, 0.6, patch.radius[1] * 1.1]}
      geometry={unitDisc}
      onPointerOver={over(patch)}
      onPointerOut={out(patch)}
      onPointerDown={tap(patch)}
    >
      <meshBasicMaterial colorWrite={false} depthWrite={false} />
    </mesh>
  ));
}

export function Fields() {
  return isWinter() ? <SnowPiles /> : <GrowHits />;
}

function multiplier(color: string, ripe: string): Color {
  const want = new Color(color);
  const have = new Color(ripe);
  return new Color(
    Math.min(1, want.r / have.r),
    Math.min(1, want.g / have.g),
    Math.min(1, want.b / have.b),
  );
}

type Look = { tall: number; wide: number; tint: Color };

function flowerAt(stage: Stage, petals: string, late: number): Look {
  const k = stage === CUT_BACK ? 0 : stage;
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

function petalColors(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute vec3 petals;\nvarying vec3 vPetals;",
      )
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

export function FieldPlants() {
  return isWinter() ? null : <Flowers />;
}

function Flowers() {
  const { scene } = useGLTF(FLOWER, "/draco/");
  const modelHeight = useModelSize(FLOWER).y;
  const light = useRoomLight();
  const refs = useRef<(InstancedMesh | null)[]>([]);
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const found: Part[] = [];
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh && !Array.isArray(mesh.material))
        found.push({ mesh, local: object.matrixWorld });
    });
    return found;
  }, [scene]);

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

  const groups = useMemo(
    () => PATCHES.map((patch) => FLOWERS.flatMap((plant, i) => (plant.patch === patch ? [i] : []))),
    [],
  );
  const drawn = useRef<Stage[]>(PATCHES.map(() => -1));
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
            .compose(
              position.set(plant.x, 0, plant.z),
              turn,
              size.set(scale * look.wide, scale * look.tall, scale * look.wide),
            )
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
    PATCHES.forEach((patch, g) => {
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
