import type { WebGLProgramParametersWithUniforms } from "three";

const VERTEX = `
  vec4 grainPosition = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    grainPosition = instanceMatrix * grainPosition;
  #endif
  vGrainPosition = (modelMatrix * grainPosition).xz;
`;

const FRAGMENT = `
  const vec3 PAPER = vec3(0.93, 0.92, 0.88);
  float grainHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float grainNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(grainHash(i), grainHash(i + vec2(1.0, 0.0)), u.x),
      mix(grainHash(i + vec2(0.0, 1.0)), grainHash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float grain(vec2 p) {
    return grainNoise(p * 0.35) * 0.5 + grainNoise(p * 1.4) * 0.3 + grainNoise(p * 6.0) * 0.2;
  }
`;

export const grain = (wash: number) => ({
  customProgramCacheKey: () => `my-city-grain-${wash}`,
  onBeforeCompile(shader: WebGLProgramParametersWithUniforms) {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vGrainPosition;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${VERTEX}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec2 vGrainPosition;\n${FRAGMENT}`)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, PAPER, ${wash.toFixed(2)}) * (0.93 + 0.14 * grain(vGrainPosition));`,
      );
  },
});
