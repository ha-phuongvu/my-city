import {
  Color,
  LinearSRGBColorSpace,
  Material,
  MeshDepthMaterial,
  type Object3D,
  Vector2,
  type WebGLProgramParametersWithUniforms,
} from "three";
import { GROUND_Y, PAPER, SNOW, WAVE } from "../constants/wave.constants";
import { isWinter } from "./season";

const onScreen = (hex: string) =>
  new Color().setHex(Number.parseInt(hex.slice(1), 16), LinearSRGBColorSpace);
const SNOW_UNIFORMS = {
  snowLight: { value: onScreen(SNOW.light) },
  snowShade: { value: onScreen(SNOW.shade) },
};

export const WAVE_UNIFORMS = {
  waveC: { value: new Vector2() },
  waveR: { value: 1e6 },
  waveW: { value: WAVE.width },
  waveG: { value: GROUND_Y },
  wavePaper: { value: onScreen(PAPER) },
  waveGlow: { value: onScreen(WAVE.glow) },
  waveLit: { value: 0 },
};

export const WAVE_GLSL = `
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
  vec3 wavePaint(vec3 c, vec2 g) {
    float fd = waveR - length(g - waveC);
    float shown = smoothstep(0.0, 0.45 * waveW, fd);
    c = shown > 0.0 ? mix(wavePaper, c, shown) : wavePaper;
    float k = fd / (0.16 * waveW);
    float glow = 0.55 * waveLit * exp(-k * k);
    return glow > 0.0 ? mix(c, waveGlow, glow) : c;
  }
`;

const FLATTEN = `
  {
    vec3 waveWorld = transpose(mat3(viewMatrix)) * (mvPosition.xyz - viewMatrix[3].xyz);
    vWaveGround = waveWorld.xz;
    waveWorld.y = waveG + (waveWorld.y - waveG) * waveRise(waveWorld.xz);
    mvPosition = viewMatrix * vec4(waveWorld, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;
const PROJECTED = "gl_Position = projectionMatrix * mvPosition;";

const SNOW_VERTEX = `
  {
    #ifdef USE_INSTANCING
      vec3 snowN = mat3(modelMatrix) * mat3(instanceMatrix) * normal;
    #else
      vec3 snowN = mat3(modelMatrix) * normal;
    #endif
    vSnowUp = dot(snowN, snowN) > 0.0 ? normalize(snowN).y : 0.0;
  }
`;
const SNOW_GLSL = `
  uniform vec3 snowLight;
  uniform vec3 snowShade;
  uniform float snowCover;
  varying float vSnowUp;
  #ifndef SNOW_HERE
    #define SNOW_HERE 1.0
  #endif
`;
const SNOW_FRAGMENT = `
  {
    float up = gl_FrontFacing ? vSnowUp : -vSnowUp;
    float f = clamp((up - ${SNOW.from.toFixed(3)}) / ${(SNOW.to - SNOW.from).toFixed(3)}, 0.0, 1.0);
    vec3 snow = mix(snowShade, snowLight, clamp(up, 0.0, 1.0));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, snow, f * f * (3.0 - 2.0 * f) * ${SNOW.most.toFixed(3)} * snowCover * SNOW_HERE);
  }
`;

const waved = new WeakSet<Material>();

const bare = new WeakSet<Material>();

const covers = new WeakMap<Material, { value: number }>();

function snowCoverOf(material: Material) {
  let cover = covers.get(material);
  if (!cover) {
    cover = { value: 1 };
    covers.set(material, cover);
  }
  return cover;
}

export function setSnowCover(material: Material, value: number) {
  snowCoverOf(material).value = value;
}

export function waveIn<M extends Material>(material: M): M {
  if (waved.has(material)) return material;
  waved.add(material);
  const before = material.onBeforeCompile;
  const ownKey = Object.hasOwn(material, "customProgramCacheKey")
    ? material.customProgramCacheKey
    : null;
  const hadBefore = before !== Material.prototype.onBeforeCompile;
  const snowy = () => isWinter() && !bare.has(material);
  material.onBeforeCompile = function (shader: WebGLProgramParametersWithUniforms, renderer) {
    if (hadBefore) before.call(this, shader, renderer);
    Object.assign(shader.uniforms, WAVE_UNIFORMS);
    const snow = snowy();
    if (snow) Object.assign(shader.uniforms, SNOW_UNIFORMS, { snowCover: snowCoverOf(material) });
    const after = `${FLATTEN}${snow ? SNOW_VERTEX : ""}`;
    let vertex = shader.vertexShader;
    if (vertex.includes("#include <project_vertex>"))
      vertex = vertex.replace("#include <project_vertex>", `#include <project_vertex>\n${after}`);
    else if (vertex.includes(PROJECTED))
      vertex = vertex.replace(PROJECTED, `${PROJECTED}\n${after}`);
    else return;
    const head = `${WAVE_GLSL}\n${snow ? SNOW_GLSL : ""}`;
    shader.vertexShader = `${head}\n${vertex}`;
    if (shader.fragmentShader.includes("#include <fog_fragment>"))
      shader.fragmentShader = `${head}\n${shader.fragmentShader.replace(
        "#include <fog_fragment>",
        `${snow ? SNOW_FRAGMENT : ""}gl_FragColor.rgb = wavePaint(gl_FragColor.rgb, vWaveGround);\n#include <fog_fragment>`,
      )}`;
  };
  material.customProgramCacheKey = () =>
    `${ownKey ? ownKey.call(material) : hadBefore ? before.toString() : ""}|wave${snowy() ? "|snow" : ""}`;
  material.needsUpdate = true;
  return material;
}

export const ownWave = <M extends Material>(material: M): M => {
  waved.add(material);
  return material;
};

const flatShadow = waveIn(new MeshDepthMaterial());
const lent = new WeakSet<Object3D>();

export function waveAll(object: Object3D, noSnow = false) {
  if (object.userData.noWave) return;
  const keepBare = noSnow || !!object.userData.noSnow;
  const { material, customDepthMaterial } = object as Object3D & {
    material?: Material | Material[];
  };
  if (material) {
    for (const m of Array.isArray(material) ? material : [material]) {
      if (keepBare && !waved.has(m)) bare.add(m);
      waveIn(m);
    }
    if (customDepthMaterial) waveIn(customDepthMaterial);
    else if (object.castShadow) {
      object.customDepthMaterial = flatShadow;
      lent.add(object);
    }
  }
  for (const child of object.children) waveAll(child, keepBare);
}

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
