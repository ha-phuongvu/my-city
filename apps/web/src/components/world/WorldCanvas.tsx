"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BackSide,
  Color,
  Float32BufferAttribute,
  type Mesh,
  Raycaster,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  type Vector3,
} from "three";
import { HOWL } from "@/lib/palette";
import { FieldPlants, Fields } from "./Fields";
import { Foliage } from "./Foliage";
import { Grass } from "./Grass";
import { Ground } from "./Ground";
import { Fountain } from "./models/Fountain";
import { PlazaWall } from "./PlazaWall";
import { Pond } from "./Pond";
import { Scenery } from "./Scenery";
import { Signs } from "./Signs";
import { SurveyFlags } from "./SurveyFlags";
import { Symbols } from "./Symbols";
import { WindLines } from "./WindLines";
import {
  CAM_Y,
  DOME,
  FOG,
  FOV,
  FRAME,
  HALF_FOV,
  OUT_FLOOR,
  OUT_FRAME,
  REACH,
  ROAM,
  TILT,
} from "./WorldCanvas.constants";
import { WorldLights } from "./WorldLights";
import { WorldProps } from "./WorldProps";

type Props = { label: string };

const clamp = (value: number, [low, high]: readonly [number, number]) => Math.max(low, Math.min(high, value));
// how far back the camera stands to show a frame of ground across and down a screen of this shape
const fitting = (frame: { width: number; height: number }, aspect: number) =>
  Math.max(frame.height / 2 / HALF_FOV, frame.width / 2 / (HALF_FOV * aspect));
// a colour's red, green and blue on the page (0 to 1), to mix two of them as the prototype does
const rgb = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
const mix = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k);

/**
 * The sky: a dome from the haze along the horizon up to deep blue overhead. It goes wherever the
 * camera goes, so it's always the same far away.
 */
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
        up > 0.32 ? mix(mid, top, Math.min(1, (up - 0.32) / 0.6)) : up > 0.02 ? mix(low, mid, (up - 0.02) / 0.3) : low;
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
      <mesh ref={dome} geometry={geometry} renderOrder={-1} frustumCulled={false}>
        <meshBasicMaterial vertexColors side={BackSide} fog={false} depthWrite={false} />
      </mesh>
    </>
  );
}

/** Where the camera is: the spot on the ground it looks at (tx, tz), turned th round it, tilted ph down from overhead, r away */
type Orbit = { tx: number; tz: number; th: number; ph: number; r: number };
type Drag = { pan: boolean; moved: boolean; start: [number, number]; mid: [number, number, number]; gap: number; t: number };

/**
 * Walking round the world, as the prototype's "Walk around in 3D" view. Dragging turns the view
 * round the spot it looks at and tilts it, and it turns on a little after letting go; the right
 * button, shift or two fingers move over the land; the wheel or a pinch zooms in on the spot under
 * the pointer; a double-click glides there; the arrow keys turn and tilt, + and - zoom. It opens where
 * the prototype's map does: from the same side and height, framing what the map's frame shows.
 */
function WalkControls() {
  const get = useThree((state) => state.get);
  const tick = useRef<(ms: number) => void>(() => {});

  useLayoutEffect(() => {
    const { camera, gl, size } = get();
    const canvas = gl.domElement;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const o: Orbit = { tx: FRAME.center[0], tz: FRAME.center[2], th: Math.PI / 4, ph: Math.acos(1 / Math.sqrt(3)), r: 50 };
    o.r = fitting(FRAME, size.width / Math.max(1, size.height));
    const vel = { th: 0, ph: 0 };
    let glide: { from: [number, number]; to: [number, number]; t0: number; ms: number } | null = null;
    let drag: Drag | null = null;
    let pointers: Record<number, [number, number]> = {};

    // how near and far it may stand: zoomed out, as far as the prototype's "Zoomed out" view on a
    // screen of this shape (never nearer than the opening view)
    function reach(): [number, number] {
      const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
      const opening = fitting(FRAME, aspect);
      return [REACH[0], Math.max(opening, Math.min(REACH[1], fitting(OUT_FRAME, aspect), opening / OUT_FLOOR))];
    }

    function place() {
      // (tilted right down it stays at least treetop height above the ground)
      o.r = clamp(o.r, reach());
      o.ph = Math.min(TILT[1], Math.acos(Math.min(1, CAM_Y / o.r)), Math.max(TILT[0], o.ph));
      const far = Math.hypot(o.tx, o.tz);
      if (far > ROAM) {
        o.tx *= ROAM / far;
        o.tz *= ROAM / far;
      }
      const out = Math.sin(o.ph);
      camera.position.set(o.tx + o.r * out * Math.sin(o.th), o.r * Math.cos(o.ph), o.tz + o.r * out * Math.cos(o.th));
      camera.lookAt(o.tx, 0, o.tz);
    }

    // the spot on the ground under the pointer, if it's pointing at the ground
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
    // zoom by f (under 1 comes closer) on the spot under the pointer, which stays under it
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
    // move over the land with the pointer (a pixel is this much ground where the camera looks)
    function pan(dx: number, dy: number) {
      const k = (2 * o.r * HALF_FOV) / Math.max(1, canvas.clientHeight);
      const kz = k / Math.max(0.35, Math.cos(o.ph));
      const c = Math.cos(o.th);
      const s = Math.sin(o.th);
      o.tx += -c * dx * k - s * dy * kz;
      o.tz += s * dx * k - c * dy * kz;
      place();
    }

    // one finger or the left button turns and tilts; the right button, shift or two fingers move and pinch
    const mid = (): [number, number, number] => {
      const all = Object.values(pointers);
      const n = Math.max(1, all.length);
      return [all.reduce((sum, p) => sum + p[0], 0) / n, all.reduce((sum, p) => sum + p[1], 0) / n, all.length];
    };
    const gap = () => {
      const all = Object.values(pointers);
      return all.length > 1 ? Math.hypot(all[0][0] - all[1][0], all[0][1] - all[1][1]) : 0;
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    const onPointerDown = (event: PointerEvent) => {
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
      } catch {
        // (a pointer that has already gone can't be held; the drag just ends with it)
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag || !pointers[event.pointerId]) return;
      pointers[event.pointerId] = [event.clientX, event.clientY];
      const m = mid();
      const now = performance.now();
      const dt = Math.max(1, now - drag.t);
      if (!drag.moved) {
        if (m[2] < 2 && Math.hypot(event.clientX - drag.start[0], event.clientY - drag.start[1]) < 4) return;
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
        // a drag the height of the screen turns it all the way round
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
      // after letting go it turns on a little and slows down
      if (!drag.moved || drag.pan || still || performance.now() - drag.t > 80) vel.th = vel.ph = 0;
      drag = null;
    };
    const onWheel = (event: WheelEvent) => {
      const d =
        event.deltaY * (event.deltaMode === 1 ? 33 : event.deltaMode === 2 ? 800 : 1) * (event.ctrlKey ? 10 : 1);
      const f = 0.95 ** (Math.abs(d) * 0.01);
      if (!d || clamp(o.r * (d < 0 ? f : 1 / f), reach()) === o.r) return;
      event.preventDefault();
      glide = null;
      zoomBy(d < 0 ? f : 1 / f, event.clientX, event.clientY);
    };
    // a double-click glides the camera to the spot on the ground
    const onDoubleClick = (event: MouseEvent) => {
      const g = groundAt(event.clientX, event.clientY);
      if (g) glide = { from: [o.tx, o.tz], to: [g.x, g.z], t0: performance.now(), ms: still ? 1 : 650 };
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const k = event.key;
      if (k === "ArrowLeft") o.th += 0.12;
      else if (k === "ArrowRight") o.th -= 0.12;
      else if (k === "ArrowUp") o.ph -= 0.07;
      else if (k === "ArrowDown") o.ph += 0.07;
      else if (k === "+" || k === "=") o.r *= 0.85;
      else if (k === "-" || k === "_") o.r /= 0.85;
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
        const ease = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
        o.tx = glide.from[0] + (glide.to[0] - glide.from[0]) * ease;
        o.tz = glide.from[1] + (glide.to[1] - glide.from[1]) * ease;
        if (t >= 1) glide = null;
        place();
      }
    };

    place();
    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";
    canvas.style.outline = "none";
    // the arrow keys work straight away
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
  }, [get]);

  useFrame((_, delta) => tick.current(Math.min(50, delta * 1000)));
  return null;
}

function Landmarks() {
  // The fountain, in map units, with its water falling: the prototype's ground is 0.15 up, so it sits
  // that far down. The stone bridge and the other models that stand still are Scenery's.
  return (
    <>
      <Fountain position={[0, -0.15, 0]} />
      <SurveyFlags />
    </>
  );
}

// The 3D world, to walk round: the camera opens looking down the same diagonal as the reference
// pictures, so the GLB models line up with how they were drawn, and then turns all the way round them.
export default function WorldCanvas({ label }: Props) {
  return (
    <Canvas
      aria-label={label}
      role="img"
      flat
      dpr={[1, 2]}
      camera={{ fov: FOV, near: 1.5, far: 4000, position: [FRAME.center[0] + 30, 30, FRAME.center[2] + 30] }}
    >
      <WalkControls />
      <Sky />
      <WorldLights />
      <Fields />
      <Foliage />
      <WindLines />
      <Suspense fallback={null}>
        <Ground />
        <Grass />
        <WorldProps />
        <Pond />
        <PlazaWall />
        <Scenery />
        <Landmarks />
        <FieldPlants />
        <Symbols />
        <Signs />
      </Suspense>
    </Canvas>
  );
}
