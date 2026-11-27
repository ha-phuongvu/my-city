"use client";

import { Language } from "@/i18n/language";
import { KeyName } from "../constants/keys.constants";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  type RefObject,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BackSide,
  Color,
  DefaultLoadingManager,
  Float32BufferAttribute,
  type Mesh,
  Raycaster,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  type Vector3,
} from "three";
import { HOWL } from "../constants/palette.constants";
import { FieldPlants, Fields } from "../environment/Fields";
import { Foliage } from "../environment/Foliage";
import { Grass } from "../environment/Grass";
import { Ground } from "../environment/Ground";
import { Arrived, type Intro, Opening, type OpeningWords } from "../opening/Opening";
import { Fountain } from "../cities/plaza/Fountain";
import { PlazaWall } from "../cities/plaza/PlazaWall";
import { Pond } from "../environment/Pond";
import { River } from "../environment/River";
import { Scenery } from "../cities/Scenery";
import { Signs } from "../cities/Signs";
import { SurveyFlags } from "../cities/future/SurveyFlags";
import { Symbols } from "../cities/Symbols";
import { WindLines } from "../environment/WindLines";
import {
  CAM_Y,
  DOME,
  FIT_ROOM,
  FOG,
  FOV,
  FRAME,
  HALF_FOV,
  OUT_FLOOR,
  OPENING,
  OUT_FRAME,
  REACH,
  ROAM,
  TILT,
} from "../constants/core/WorldCanvas.constants";
import { WorldLights } from "./WorldLights";
import { WorldProps } from "../cities/WorldProps";
import { isWinter } from "../utils/season";
import { Winter } from "../seasons/Winter";
import { Calendar, type CalendarWords } from "../ui/Calendar";
import { setOpening } from "../utils/opening";
import { ease } from "../utils/curves";
import { hexRgb, mixRgb } from "../utils/color";

export type FrameWords = { language: Language; calendar: CalendarWords };

type Props = {
  label: string;
  opening: OpeningWords;
  frame: FrameWords;
  onProgress: (share: number) => void;
  onShown: () => void;
};

const clamp = (value: number, [low, high]: readonly [number, number]) =>
  Math.max(low, Math.min(high, value));

const fitting = (frame: { width: number; height: number }, aspect: number) =>
  FIT_ROOM * Math.max(frame.height / 2 / HALF_FOV, frame.width / 2 / (HALF_FOV * aspect));

const rgb = (hex: string) => hexRgb(hex).map((v) => v / 255);

function Sky() {
  const dome = useRef<Mesh>(null);
  const geometry = useMemo(() => {
    const sphere = new SphereGeometry(DOME, 48, 24);
    const [top, mid, low] = [HOWL.light.sky.top, HOWL.light.sky.mid, HOWL.light.sky.low].map(rgb);
    const position = sphere.getAttribute("position");
    const colors: number[] = [];
    const color = new Color();
    for (let i = 0; i < position.count; i++) {
      const up = position.getY(i) / DOME;
      const [r, g, b] =
        up > 0.32
          ? mixRgb(mid, top, Math.min(1, (up - 0.32) / 0.6))
          : up > 0.02
            ? mixRgb(low, mid, (up - 0.02) / 0.3)
            : low;
      color.setRGB(r, g, b, SRGBColorSpace);
      colors.push(color.r, color.g, color.b);
    }
    sphere.setAttribute("color", new Float32BufferAttribute(colors, 3));
    return sphere;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ camera }) => {
    dome.current?.position.copy(camera.position);
  });
  return (
    <>
      <color attach="background" args={[HOWL.light.sky.low]} />
      <fog attach="fog" args={[HOWL.light.sky.low, FOG[0], FOG[1]]} />
      <mesh
        ref={dome}
        geometry={geometry}
        renderOrder={-1}
        frustumCulled={false}
        userData={{ noWave: true }}
      >
        <meshBasicMaterial vertexColors side={BackSide} fog={false} depthWrite={false} />
      </mesh>
    </>
  );
}

type Orbit = { tx: number; tz: number; th: number; ph: number; r: number };
type Drag = {
  pan: boolean;
  moved: boolean;
  start: [number, number];
  mid: [number, number, number];
  gap: number;
  t: number;
};

function WalkControls({ intro }: { intro: RefObject<Intro> }) {
  const get = useThree((state) => state.get);
  const tick = useRef<(ms: number) => void>(() => {});

  useLayoutEffect(() => {
    const { camera, gl, size } = get();
    const canvas = gl.domElement;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const o: Orbit = {
      tx: OPENING.center[0],
      tz: OPENING.center[1],
      th: OPENING.turn,
      ph: OPENING.tilt,
      r: OPENING.distance * Math.max(1, OPENING.aspect / (size.width / Math.max(1, size.height))),
    };
    const vel = { th: 0, ph: 0 };
    let glide: { from: [number, number]; to: [number, number]; t0: number; ms: number } | null =
      null;
    let drag: Drag | null = null;
    let pointers: Record<number, [number, number]> = {};

    function reach(): [number, number] {
      const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
      const opening = fitting(FRAME, aspect);
      return [
        REACH[0],
        Math.max(opening, Math.min(REACH[1], fitting(OUT_FRAME, aspect), opening / OUT_FLOOR)),
      ];
    }

    function place() {
      o.r = clamp(o.r, reach());
      o.ph = Math.min(TILT[1], Math.acos(Math.min(1, CAM_Y / o.r)), Math.max(TILT[0], o.ph));
      const far = Math.hypot(o.tx, o.tz);
      if (far > ROAM) {
        o.tx *= ROAM / far;
        o.tz *= ROAM / far;
      }
      const out = Math.sin(o.ph);
      camera.position.set(
        o.tx + o.r * out * Math.sin(o.th),
        o.r * Math.cos(o.ph),
        o.tz + o.r * out * Math.cos(o.th),
      );
      camera.lookAt(o.tx, 0, o.tz);
    }

    const ray = new Raycaster();
    const at = new Vector2();
    function groundAt(x: number, y: number): Vector3 | null {
      const box = canvas.getBoundingClientRect();
      at.set(((x - box.left) / box.width) * 2 - 1, -((y - box.top) / box.height) * 2 + 1);
      camera.updateMatrixWorld();
      ray.setFromCamera(at, camera);
      const { origin, direction } = ray.ray;
      if (direction.y > -1e-4) return null;
      return origin.clone().addScaledVector(direction, -origin.y / direction.y);
    }

    function zoomBy(f: number, x?: number, y?: number) {
      const r = clamp(o.r * f, reach());
      const g = x === undefined || y === undefined ? null : groundAt(x, y);
      if (g && Math.hypot(g.x - o.tx, g.z - o.tz) < 400) {
        o.tx += (g.x - o.tx) * (1 - r / o.r);
        o.tz += (g.z - o.tz) * (1 - r / o.r);
      }
      o.r = r;
      place();
    }

    function pan(dx: number, dy: number) {
      const k = (2 * o.r * HALF_FOV) / Math.max(1, canvas.clientHeight);
      const kz = k / Math.max(0.35, Math.cos(o.ph));
      const c = Math.cos(o.th);
      const s = Math.sin(o.th);
      o.tx -= c * dx * k + s * dy * kz;
      o.tz += s * dx * k - c * dy * kz;
      place();
    }

    const mid = (): [number, number, number] => {
      const all = Object.values(pointers);
      const n = Math.max(1, all.length);
      return [
        all.reduce((sum, p) => sum + p[0], 0) / n,
        all.reduce((sum, p) => sum + p[1], 0) / n,
        all.length,
      ];
    };
    const gap = () => {
      const all = Object.values(pointers);
      return all.length > 1 ? Math.hypot(all[0][0] - all[1][0], all[0][1] - all[1][1]) : 0;
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    const onPointerDown = (event: PointerEvent) => {
      if (intro.current.on) return;
      pointers[event.pointerId] = [event.clientX, event.clientY];
      vel.th = vel.ph = 0;
      glide = null;
      drag = {
        pan: event.button === 1 || event.button === 2 || event.shiftKey,
        moved: drag ? drag.moved : false,
        start: [event.clientX, event.clientY],
        mid: mid(),
        gap: gap(),
        t: performance.now(),
      };
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {}
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag || !pointers[event.pointerId]) return;
      pointers[event.pointerId] = [event.clientX, event.clientY];
      const m = mid();
      const now = performance.now();
      const dt = Math.max(1, now - drag.t);
      if (!drag.moved) {
        if (
          m[2] < 2 &&
          Math.hypot(event.clientX - drag.start[0], event.clientY - drag.start[1]) < 4
        )
          return;
        drag.moved = true;
        canvas.style.cursor = "grabbing";
      }
      const dx = m[0] - drag.mid[0];
      const dy = m[1] - drag.mid[1];
      const g = gap();
      if (m[2] >= 2) {
        if (drag.gap && g) zoomBy(drag.gap / g, m[0], m[1]);
        pan(dx, dy);
      } else if (drag.pan) pan(dx, dy);
      else {
        const H = Math.max(1, canvas.clientHeight);
        const dth = (-2 * Math.PI * dx) / H;
        const dph = (-2 * Math.PI * dy) / H;
        o.th += dth;
        o.ph += dph;
        vel.th = 0.6 * vel.th + 0.4 * (dth / dt);
        vel.ph = 0.6 * vel.ph + 0.4 * (dph / dt);
        place();
      }
      drag.mid = m;
      drag.gap = g;
      drag.t = now;
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!pointers[event.pointerId]) return;
      delete pointers[event.pointerId];
      if (!drag) return;
      if (Object.keys(pointers).length) {
        drag.mid = mid();
        drag.gap = gap();
        return;
      }
      canvas.style.cursor = "grab";

      if (!drag.moved || drag.pan || still || performance.now() - drag.t > 80) vel.th = vel.ph = 0;
      drag = null;
    };
    const onWheel = (event: WheelEvent) => {
      if (intro.current.on) return;
      const d =
        event.deltaY *
        (event.deltaMode === 1 ? 33 : event.deltaMode === 2 ? 800 : 1) *
        (event.ctrlKey ? 10 : 1);
      const f = 0.95 ** (Math.abs(d) * 0.01);
      if (!d || clamp(o.r * (d < 0 ? f : 1 / f), reach()) === o.r) return;
      event.preventDefault();
      glide = null;
      zoomBy(d < 0 ? f : 1 / f, event.clientX, event.clientY);
    };

    const onDoubleClick = (event: MouseEvent) => {
      if (intro.current.on) return;
      const g = groundAt(event.clientX, event.clientY);
      if (g)
        glide = { from: [o.tx, o.tz], to: [g.x, g.z], t0: performance.now(), ms: still ? 1 : 650 };
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (intro.current.on) return;
      const k = event.key as KeyName;
      if (k === KeyName.ArrowLeft) o.th += 0.12;
      else if (k === KeyName.ArrowRight) o.th -= 0.12;
      else if (k === KeyName.ArrowUp) o.ph -= 0.07;
      else if (k === KeyName.ArrowDown) o.ph += 0.07;
      else if (k === KeyName.Plus || k === KeyName.Equals) o.r *= 0.85;
      else if (k === KeyName.Minus || k === KeyName.Underscore) o.r /= 0.85;
      else return;
      event.preventDefault();
      place();
    };

    tick.current = (ms) => {
      if (!drag && (vel.th || vel.ph)) {
        o.th += vel.th * ms;
        o.ph += vel.ph * ms;
        const k = 0.92 ** (ms / 16.7);
        vel.th *= k;
        vel.ph *= k;
        if (Math.abs(vel.th) + Math.abs(vel.ph) < 2e-5) vel.th = vel.ph = 0;
        place();
      }
      if (glide) {
        const t = Math.min(1, (performance.now() - glide.t0) / glide.ms);
        const k = ease(t);
        o.tx = glide.from[0] + (glide.to[0] - glide.from[0]) * k;
        o.tz = glide.from[1] + (glide.to[1] - glide.from[1]) * k;
        if (t >= 1) glide = null;
        place();
      }
    };

    place();
    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";
    canvas.style.outline = "none";

    canvas.tabIndex = 0;
    canvas.focus({ preventScroll: true });
    canvas.addEventListener("contextmenu", onContextMenu);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("dblclick", onDoubleClick);
    canvas.addEventListener("keydown", onKeyDown);
    return () => {
      tick.current = () => {};
      pointers = {};
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDoubleClick);
      canvas.removeEventListener("keydown", onKeyDown);
    };
  }, [get, intro]);

  useFrame((_, delta) => tick.current(Math.min(50, delta * 1000)));
  return null;
}

function Landmarks() {
  return (
    <>
      <Fountain position={[0, -0.15, 0]} />
      <SurveyFlags />
    </>
  );
}

export default function WorldCanvas({ label, opening, frame, onProgress, onShown }: Props) {
  const intro = useRef<Intro>({ on: true, arrived: false });
  const [welcome, setWelcome] = useState(true);
  useEffect(() => {
    setOpening(welcome);
    return () => setOpening(false);
  }, [welcome]);
  useLayoutEffect(() => {
    const before = DefaultLoadingManager.onProgress;
    DefaultLoadingManager.onProgress = (url, loaded, total) => {
      before?.(url, loaded, total);
      if (total) onProgress(loaded / total);
    };
    return () => {
      DefaultLoadingManager.onProgress = before;
    };
  }, [onProgress]);
  return (
    <>
      <Canvas
        aria-label={label}
        role="img"
        flat
        dpr={[1, 2]}
        camera={{
          fov: FOV,
          near: 1.5,
          far: 4000,
          position: [FRAME.center[0] + 30, 30, FRAME.center[2] + 30],
        }}
      >
        <WalkControls intro={intro} />
        <Sky />
        <WorldLights />
        <Fields />

        <group userData={{ noSnow: true }}>
          <Foliage />
          <WindLines />
        </group>
        <Suspense fallback={null}>
          <group userData={{ noSnow: true }}>
            <Ground />
            <Grass />

            {!isWinter() && <Pond />}
            {!isWinter() && <River />}
            <Symbols />
            <Signs />
          </group>
          <WorldProps />
          <PlazaWall />
          <Scenery />
          <Landmarks />
          <FieldPlants />
          <Winter />
          <Arrived intro={intro} />
        </Suspense>
        {welcome && (
          <Opening
            intro={intro}
            words={opening}
            onShown={onShown}
            onDone={() => {
              intro.current.on = false;
              setWelcome(false);
            }}
          />
        )}
      </Canvas>

      {!welcome && <Calendar words={frame.calendar} language={frame.language} />}
    </>
  );
}
