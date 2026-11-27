// Shared helpers for transitions.
import * as THREE from "three";
import { COLOR, NOISE } from "../glsl.js";

// A linear-light, mip-mapped copy of a frame. Sample it with textureLod for cheap blur,
// local averages, bokeh colours and soft shadows (no separable blur passes needed).
export function mipCopy(gfx, { scale = 1 } = {}) {
  const rt = gfx.target({ scale, mips: true });
  rt.texture.anisotropy = 8;
  const pass = gfx.pass(COLOR + "uniform sampler2D tA; void main(){ o=vec4(toLin(clamp(texture(tA,vUv).rgb,0.,1.)),1.); }", { tA: null });
  return { rt, get texture() { return rt.texture; }, update(src) { pass.u.tA.value = src.texture; pass.render(rt); return rt.texture; } };
}

// Common GLSL for transitions: noise, colour, easing.
export const TLIB = NOISE + COLOR + /* glsl */ `
float sat(float x){ return clamp(x,0.,1.); }
float ss(float a,float b,float x){ return smoothstep(a,b,x); }
float sm5(float t){ t=sat(t); return t*t*t*(t*(t*6.-15.)+10.); }
float io5(float t){ t=sat(t); return t<.5?16.*t*t*t*t*t:1.-pow(-2.*t+2.,5.)*.5; }
vec2 hash22(vec2 p){ vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
`;

export const smooth5 = (t) => ((t = Math.min(1, Math.max(0, t))), t * t * t * (t * (t * 6 - 15) + 10));
export const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export { THREE };
