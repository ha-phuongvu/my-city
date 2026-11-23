"use client";

import { type ThreeElements, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  type Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
} from "three";
import { type MotionProps, useCycle } from "../../utils/cycle";
import { useParts } from "../../utils/useParts";
import { useRoomLight, withRoomLight } from "../../utils/roomLight";
import {
  AROUND,
  BANDS,
  COLUMNS,
  DASH_ROUND,
  DOWN,
  DROP,
  DROPS,
  FALLS,
  FOAM,
  HOUR,
  LIP,
  PULSE,
  RIPPLE,
  RIPPLES,
  STRAND,
  STRANDS,
  STREAK,
} from "../../constants/cities/plaza/Fountain.constants";

const isStreak = (i: number) => (i * 37) % COLUMNS < 14;

function fall(t: number): [number, number] {
  return [FALLS.r0 + (FALLS.r1 - FALLS.r0) * Math.sqrt(t), FALLS.z0 - DROP * t * t];
}

function cone(out: number, byLength: boolean): BufferGeometry {
  const ts = Array.from({ length: DOWN + 1 }, (_, j) => j / DOWN);
  const ring = ts.map(fall);
  const lengths = [0];
  for (let j = 1; j <= DOWN; j++) {
    lengths.push(
      lengths[j - 1] + Math.hypot(ring[j][0] - ring[j - 1][0], ring[j][1] - ring[j - 1][1]),
    );
  }
  const position: number[] = [];
  const normal: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  for (let j = 0; j <= DOWN; j++) {
    const t = Math.max(ts[j], 1e-4);
    const dr = (FALLS.r1 - FALLS.r0) / (2 * Math.sqrt(t));
    const dz = -2 * DROP * t;
    for (let i = 0; i <= AROUND; i++) {
      const a = (i / AROUND) * Math.PI * 2;
      const r = ring[j][0] + out;
      position.push(r * Math.cos(a), r * Math.sin(a), ring[j][1]);
      const n = [-dz * Math.cos(a), -dz * Math.sin(a), dr];
      const length = Math.hypot(n[0], n[1], n[2]);
      normal.push(n[0] / length, n[1] / length, n[2] / length);
      uv.push(i / AROUND, 1 - (byLength ? lengths[j] / lengths[DOWN] : ts[j]));
      if (i < AROUND && j < DOWN) {
        const v = j * (AROUND + 1) + i;
        index.push(v, v + AROUND + 1, v + 1, v + 1, v + AROUND + 1, v + AROUND + 2);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(position), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normal), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  geometry.setIndex(index);
  return geometry;
}

function band(inner: number, outer: number, z: number, segments: number): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array((segments + 1) * 2 * 3), 3),
  );
  const uv: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    uv.push(i / segments, 0, i / segments, 1);
    if (i < segments) index.push(2 * i, 2 * i + 2, 2 * i + 1, 2 * i + 1, 2 * i + 2, 2 * i + 3);
  }
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  geometry.setIndex(index);
  resize(geometry, inner, outer, z);
  return geometry;
}

function resize(geometry: BufferGeometry, inner: number, outer: number, z: number) {
  const position = geometry.getAttribute("position") as BufferAttribute;
  const segments = position.count / 2 - 1;
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    position.setXYZ(2 * i, inner * Math.cos(a), inner * Math.sin(a), z);
    position.setXYZ(2 * i + 1, outer * Math.cos(a), outer * Math.sin(a), z);
  }
  position.needsUpdate = true;
  geometry.computeBoundingSphere();
}

function canvas(
  width: number,
  height: number,
): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const paper = document.createElement("canvas");
  paper.width = width;
  paper.height = height;
  return [paper, paper.getContext("2d")];
}

function texture(paper: HTMLCanvasElement): CanvasTexture {
  const map = new CanvasTexture(paper);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function sheetPaper(): CanvasTexture {
  const [paper, context] = canvas(COLUMNS * 8, BANDS.length * 16);
  if (context) {
    for (let i = 0; i < COLUMNS; i++) {
      for (let k = 0; k < BANDS.length; k++) {
        context.fillStyle = isStreak(i) ? STREAK : BANDS[k];
        context.fillRect(i * 8, k * 16, 8, 16);
      }
    }
  }
  return texture(paper);
}

function streakPaper(): CanvasTexture {
  const width = 2048;
  const height = 256;
  const [paper, context] = canvas(width, height);
  if (context) {
    context.fillStyle = "#ffffff";
    const thick = Math.max(2, (STRAND.width / (2 * Math.PI * FALLS.r1)) * width);
    for (let i = 0; i < STRANDS; i++) {
      const x = ((i + 0.5 + 0.2 * Math.sin(i * 2.3)) / STRANDS) * width;

      let y = (((i * 0.37) % 0.9) / 0.9) * height;
      STRAND.dashes.forEach((length, k) => {
        const size = (length / DASH_ROUND) * height;
        if (k % 2 === 0) {
          context.fillRect(x - thick / 2, y, thick, Math.min(size, height - y));
          if (y + size > height) context.fillRect(x - thick / 2, 0, thick, y + size - height);
        }
        y = (y + size) % height;
      });
    }
  }
  const map = texture(paper);
  map.wrapS = map.wrapT = RepeatWrapping;
  map.repeat.set(1, 1 / DASH_ROUND);
  return map;
}

function foamPaper(): CanvasTexture {
  const [paper, context] = canvas(FOAM.pieces * 8, 4);
  if (context) {
    for (let i = 0; i < FOAM.pieces; i++) {
      context.fillStyle = FOAM.colors[i % 2];
      context.fillRect(i * 8, 0, 8, 4);
    }
  }
  return texture(paper);
}

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

type Props = Pick<MotionProps, "speed" | "at"> & ThreeElements["group"];

export function Fountain({ speed = 1, at, ...props }: Props) {
  const { model, part, toModel } = useParts("/models/fountain.glb");
  const light = useRoomLight();
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const clock = useCycle(HOUR, { speed: still ? 0 : speed });
  const streakSheet = useRef<Mesh>(null);
  const foamLine = useRef<Mesh>(null);
  const drops = useRef<(Mesh | null)[]>([]);
  const rings = useRef<(Mesh | null)[]>([]);

  const water = useMemo(() => {
    const sheet = withRoomLight(
      new MeshStandardMaterial({ map: sheetPaper(), roughness: 1, metalness: 0, side: DoubleSide }),
      light,
    );
    const streaks = new MeshBasicMaterial({
      map: streakPaper(),
      transparent: true,
      opacity: STRAND.opacity,
      depthWrite: false,
      side: DoubleSide,
    });
    const foam = withRoomLight(
      new MeshStandardMaterial({ map: foamPaper(), roughness: 1, metalness: 0, side: DoubleSide }),
      light,
    );
    const white = (opacity: number) =>
      new MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity,
        depthWrite: false,
        side: DoubleSide,
      });
    return {
      sheet,
      streaks,
      foam,
      pulse: white(PULSE.low),
      lip: white(LIP.opacity),
      drop: () => white(DROPS.opacity),
      ripple: () => white(0),
      shapes: {
        sheet: cone(0, false),
        streaks: cone(0.004, true),
        foam: band(FALLS.r1, FALLS.r1 + FOAM.width, FALLS.z1 + FOAM.lift, AROUND),
        pulse: band(
          FALLS.r1 - PULSE.inside,
          FALLS.r1 + PULSE.outside,
          FALLS.z1 + PULSE.lift,
          AROUND,
        ),
        lip: new TorusGeometry(FALLS.r0, LIP.thickness, 6, AROUND),
        drop: new SphereGeometry(DROPS.radius, 8, 6),
        ripples: RIPPLES.map((ring) => band(ring.reach, ring.reach, ring.z, RIPPLE.segments)),
      },
    };
  }, [light]);

  const spots = useMemo(
    () =>
      Array.from({ length: STRANDS }, (_, i) => i)
        .filter((i) => i % 3 === 1)
        .flatMap((i) =>
          DROPS.sideways.map((side, j) => ({
            angle: ((i + 0.5) / STRANDS) * Math.PI * 2,
            side,
            delay: (i * 0.29 + j * 0.41) % 0.9,
          })),
        ),
    [],
  );
  const dropLooks = useMemo(() => spots.map(() => water.drop()), [spots, water]);
  const ringLooks = useMemo(() => RIPPLES.map(() => water.ripple()), [water]);

  useEffect(() => {
    for (const name of ["falls", "foam"]) {
      const own = part(name);
      if (own) own.visible = false;
    }
  }, [part]);
  useEffect(
    () => () => {
      for (const look of [
        water.sheet,
        water.streaks,
        water.foam,
        water.pulse,
        water.lip,
        ...dropLooks,
        ...ringLooks,
      ]) {
        (look as MeshBasicMaterial).map?.dispose();
        look.dispose();
      }
      const { ripples, ...shapes } = water.shapes;
      for (const shape of [...Object.values(shapes), ...ripples]) shape.dispose();
    },
    [water, dropLooks, ringLooks],
  );

  useFrame(() => {
    const time = at === undefined ? clock() : at * RIPPLES[0].time;
    const streaks = (streakSheet.current?.material as MeshBasicMaterial | undefined)?.map;
    if (streaks) streaks.offset.y = time / STRAND.slide;
    const foam = foamLine.current?.material as MeshBasicMaterial | undefined;
    if (foam) {
      const k = (1 - Math.cos((Math.PI * time) / PULSE.time)) / 2;
      foam.opacity = still
        ? (PULSE.low + PULSE.high) / 2
        : PULSE.low + (PULSE.high - PULSE.low) * k;
    }
    spots.forEach((spot, i) => {
      const drop = drops.current[i];
      if (!drop) return;
      drop.visible = !still;
      const k = ((((time + spot.delay) / DROPS.time) % 1) + 1) % 1;
      const out = FALLS.r1 + 0.05 * k;
      const across = spot.side * easeOut(k);
      const a = spot.angle;
      drop.position.set(
        out * Math.cos(a) - across * Math.sin(a),
        out * Math.sin(a) + across * Math.cos(a),
        FALLS.z1 + 0.01 + DROPS.hop * 4 * k * (1 - k),
      );
      (drop.material as MeshBasicMaterial).opacity = DROPS.opacity * (1 - easeOut(k));
    });
    RIPPLES.forEach((ring, i) => {
      const mesh = rings.current[i];
      if (!mesh) return;
      mesh.visible = !still;
      const k = ((((time - ring.delay) / ring.time) % 1) + 1) % 1;
      const reach = ring.reach * (ring.from + (1 - ring.from) * easeOut(k));
      resize(mesh.geometry, reach - RIPPLE.width / 2, reach + RIPPLE.width / 2, ring.z);
      (mesh.material as MeshBasicMaterial).opacity =
        RIPPLE.opacity * (k < 0.15 ? easeOut(k / 0.15) : 1 - easeOut((k - 0.15) / 0.85));
    });
  });

  return (
    <group {...props}>
      <primitive object={model} />

      <group matrixAutoUpdate={false} matrix={toModel}>
        <mesh geometry={water.shapes.sheet} material={water.sheet} />
        <mesh ref={streakSheet} geometry={water.shapes.streaks} material={water.streaks} />
        <mesh geometry={water.shapes.foam} material={water.foam} />
        <mesh ref={foamLine} geometry={water.shapes.pulse} material={water.pulse} />
        <mesh geometry={water.shapes.lip} material={water.lip} position={[0, 0, FALLS.z0]} />
        {spots.map((_, i) => (
          <mesh
            key={i}
            geometry={water.shapes.drop}
            material={dropLooks[i]}
            ref={(mesh) => {
              drops.current[i] = mesh;
            }}
          />
        ))}
        {RIPPLES.map((_, i) => (
          <mesh
            key={i}
            geometry={water.shapes.ripples[i]}
            material={ringLooks[i]}
            ref={(mesh) => {
              rings.current[i] = mesh;
            }}
          />
        ))}
      </group>
    </group>
  );
}
