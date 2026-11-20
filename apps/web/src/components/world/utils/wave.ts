import {
  Color,
  LinearSRGBColorSpace,
  Material,
  MeshDepthMaterial,
  type Object3D,
  Vector2,
  type WebGLProgramParametersWithUniforms,
} from "three";
import { GROUND_Y, PAPER, WAVE } from "../constants/wave.constants";

// The opening's wave, as the prototype's: until it comes, the world lies flat on the paper in the
// paper's colour; as a ring `waveR` out from `waveC` passes over a spot, what stands there grows up
// (overshooting a little and settling) and takes its own colours, with a warm glow along the ring's
// front while `waveLit` is up. Once the opening is over the ring is so far out that nothing changes.
//
// Every material in the world takes it (waveIn): what it draws is laid flat as it's put on screen,
// and painted over just before the haze. The grass works it out in its own shaders (Grass.tsx).

// the colours as they land on screen (taken as they are, not turned), since the paint goes on after
// the colours are turned for the screen
const onScreen = (hex: string) => new Color().setHex(Number.parseInt(hex.slice(1), 16), LinearSRGBColorSpace);

export const WAVE_UNIFORMS = {
  waveC: { value: new Vector2() },
  waveR: { value: 1e6 },
  waveW: { value: WAVE.width },
  waveG: { value: GROUND_Y },
  wavePaper: { value: onScreen(PAPER) },
  waveGlow: { value: onScreen(WAVE.glow) },
  waveLit: { value: 0 },
};

export const WAVE_GLSL = /* glsl */ `
  uniform vec2 waveC;
  uniform float waveR;
  uniform float waveW;
  uniform float waveG;
  uniform vec3 wavePaper;
  uniform vec3 waveGlow;
  uniform float waveLit;
  varying vec2 vWaveGround;
  float waveRise(vec2 g) {
    float wt = clamp((waveR - length(g - waveC)) / waveW, 0.0, 1.0) - 1.0;
    return 1.0 + 2.7 * wt * wt * wt + 1.7 * wt * wt;
  }
  // (where it's still flat, or the glow doesn't reach, its own colour and the glow are left out rather
  // than mixed in at nothing: across a triangle laid flat they can come out as no number at all, and
  // mixing that in, even at nothing, leaves specks)
  vec3 wavePaint(vec3 c, vec2 g) {
    float fd = waveR - length(g - waveC);
    float shown = smoothstep(0.0, 0.45 * waveW, fd);
    c = shown > 0.0 ? mix(wavePaper, c, shown) : wavePaper;
    float k = fd / (0.16 * waveW);
    float glow = 0.55 * waveLit * exp(-k * k);
    return glow > 0.0 ? mix(c, waveGlow, glow) : c;
  }
`;

// the point on screen back in the world (the view only turns and moves it), laid down toward the ground
const FLATTEN = /* glsl */ `
  {
    vec3 waveWorld = transpose(mat3(viewMatrix)) * (mvPosition.xyz - viewMatrix[3].xyz);
    vWaveGround = waveWorld.xz;
    waveWorld.y = waveG + (waveWorld.y - waveG) * waveRise(waveWorld.xz);
    mvPosition = viewMatrix * vec4(waveWorld, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;
const PROJECTED = "gl_Position = projectionMatrix * mvPosition;";

const waved = new WeakSet<Material>();

/** Lets the wave lay a material flat and paint it (once; it keeps any shader changes it has already) */
export function waveIn<M extends Material>(material: M): M {
  if (waved.has(material)) return material;
  waved.add(material);
  const before = material.onBeforeCompile;
  const ownKey = Object.hasOwn(material, "customProgramCacheKey") ? material.customProgramCacheKey : null;
  const hadBefore = before !== Material.prototype.onBeforeCompile;
  material.onBeforeCompile = function (shader: WebGLProgramParametersWithUniforms, renderer) {
    if (hadBefore) before.call(this, shader, renderer);
    Object.assign(shader.uniforms, WAVE_UNIFORMS);
    let vertex = shader.vertexShader;
    if (vertex.includes("#include <project_vertex>"))
      vertex = vertex.replace("#include <project_vertex>", `#include <project_vertex>\n${FLATTEN}`);
    else if (vertex.includes(PROJECTED)) vertex = vertex.replace(PROJECTED, `${PROJECTED}\n${FLATTEN}`);
    else return;
    shader.vertexShader = `${WAVE_GLSL}\n${vertex}`;
    if (shader.fragmentShader.includes("#include <fog_fragment>"))
      shader.fragmentShader = `${WAVE_GLSL}\n${shader.fragmentShader.replace(
        "#include <fog_fragment>",
        "gl_FragColor.rgb = wavePaint(gl_FragColor.rgb, vWaveGround);\n#include <fog_fragment>",
      )}`;
  };
  material.customProgramCacheKey = () =>
    `${ownKey ? ownKey.call(material) : hadBefore ? before.toString() : ""}|wave`;
  material.needsUpdate = true;
  return material;
}

/** Marks a material that takes the wave in its own shaders, so waveAll leaves it be */
export const ownWave = <M extends Material>(material: M): M => {
  waved.add(material);
  return material;
};

// the sun's shadows are drawn with a plain depth material, so while the world is flat they're drawn
// flat with this one instead
const flatShadow = waveIn(new MeshDepthMaterial());
const lent = new WeakSet<Object3D>();

/**
 * Gives the wave to everything under `root` it hasn't got to yet (whatever has come in since), except
 * what's marked `noWave` and what's under it: the sky and the opening's own letters and button
 */
export function waveAll(object: Object3D) {
  if (object.userData.noWave) return;
  const { material, customDepthMaterial } = object as Object3D & { material?: Material | Material[] };
  if (material) {
    for (const m of Array.isArray(material) ? material : [material]) waveIn(m);
    if (customDepthMaterial) waveIn(customDepthMaterial);
    else if (object.castShadow) {
      object.customDepthMaterial = flatShadow;
      lent.add(object);
    }
  }
  for (const child of object.children) waveAll(child);
}

/** The world is up: the wave goes, and the shadows go back to the sun's own depth material */
export function waveDone(root: Object3D) {
  WAVE_UNIFORMS.waveR.value = 1e6;
  WAVE_UNIFORMS.waveLit.value = 0;
  root.traverse((object) => {
    if (lent.has(object)) {
      object.customDepthMaterial = undefined;
      lent.delete(object);
    }
  });
}
