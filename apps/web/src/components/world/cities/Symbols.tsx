"use client";

import { type ComponentType, useMemo } from "react";
import { CanvasTexture } from "three";
import { CITIES, type City } from "../constants/layout.constants";
import { Model, preloadModel, useModelSize } from "../core/Model";
import { Book } from "./story/Book";
import { FilmReel } from "./movie/FilmReel";
import { Kamishibai } from "./comic/Kamishibai";
import { Kendama } from "./game/Kendama";
import { Piano } from "./music/Piano";
import { useCityHit, useInCity } from "../utils/cityPointing";
import type { MotionProps } from "../utils/cycle";
import {
  CARD_YAW,
  LAWN_REACH,
  LAWN_Y,
  SHADOW,
  SHADOW_Y,
} from "../constants/cities/Symbols.constants";

// Each symbol's own motion, as on the prototype's map: the book turns a page, the piano plays its
// tune, the kendama swings its ball, the reel turns and the kamishibai shuts and opens its doors.
// The symbols hang still until their city is pointed at, then play over and over until the pointer
// leaves: each finishes the round it's on and rests, except the reel, which stops where it is.
const MOTION: Record<string, ComponentType<MotionProps>> = {
  book: Book,
  piano: Piano,
  kendama: Kendama,
  "film-reel": FilmReel,
  kamishibai: Kamishibai,
};

/** A soft round blot, dark in the middle and fading to nothing, for the shadows under the symbols */
function blot(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.7)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}

function FloatingSymbol({
  city,
  still,
  shadowTexture,
}: {
  city: City;
  still: boolean;
  shadowTexture: CanvasTexture;
}) {
  const { model, position, quaternion, height, carries = [] } = city.symbol;
  const src = `/models/${model}.glb`;
  const modelHeight = useModelSize(src).y;
  const Moving = MOTION[model];
  const pointing = useInCity(city.id);
  const hit = useCityHit(city.id);

  return (
    <>
      {/* the lawn, unseen, so pointing anywhere on it plays the city */}
      <mesh position={[city.center[0], LAWN_Y, city.center[1]]} rotation-x={-Math.PI / 2} {...hit}>
        <circleGeometry args={[LAWN_REACH, 48]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <group position={position} {...hit}>
        <group quaternion={quaternion} scale={height / modelHeight}>
          {still || !Moving ? (
            <Model src={src} center rotation-y={CARD_YAW[model]} castShadow={false} />
          ) : (
            // the models' origin is the middle of their base: lower it so they turn about their middle, as Model's `center` does
            <group rotation-y={CARD_YAW[model]}>
              <group position-y={-modelHeight / 2}>
                <Moving pointing={pointing} />
              </group>
            </group>
          )}
        </group>
        {/* what floats along with it (the piano's bench) */}
        {carries.map((c) => (
          <Model
            key={c.model}
            src={`/models/${c.model}.glb`}
            position={c.offset}
            rotation-y={c.yaw}
            scale={c.scale}
            castShadow={false}
          />
        ))}
      </group>
      <mesh
        position={[city.shadow.center[0], SHADOW_Y, city.shadow.center[1]]}
        rotation-x={-Math.PI / 2}
      >
        <planeGeometry
          args={[city.shadow.radius * 2 * SHADOW.spread, city.shadow.radius * 2 * SHADOW.spread]}
        />
        <meshBasicMaterial
          map={shadowTexture}
          color={SHADOW.color}
          opacity={SHADOW.opacity}
          transparent
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

/** Each city's giant symbol, floating over its lawn and turned toward the fountain, playing while the city is pointed at */
export function Symbols() {
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const shadowTexture = useMemo(() => blot(), []);
  return CITIES.map((city) => (
    <FloatingSymbol key={city.id} city={city} still={still} shadowTexture={shadowTexture} />
  ));
}

for (const city of CITIES)
  for (const c of city.symbol.carries ?? []) preloadModel(`/models/${c.model}.glb`);
