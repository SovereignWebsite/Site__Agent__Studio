// Thin layer over three's WebGLRenderer: HDR targets, full-screen passes, post stack, dithered present.
import * as THREE from "three";
import { HASH, COLOR } from "./glsl.js";

const PASS_VS = `precision highp float; in vec3 position; out vec2 vUv;
void main(){ vUv=position.xy*.5+.5; gl_Position=vec4(position.xy,0.,1.); }`;
const PASS_HEAD = `precision highp float; precision highp sampler2D; in vec2 vUv; out vec4 o; uniform vec2 uRes; uniform float uTime;\n`;

// Raw GLSL3 material helper used everywhere (we never use three's built-in materials).
export function material(vertexShader, fragmentShader, uniforms = {}, opts = {}) {
  const u = {};
  for (const k in uniforms) u[k] = uniforms[k] && typeof uniforms[k] === "object" && "value" in uniforms[k] ? uniforms[k] : { value: uniforms[k] };
  return new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader, fragmentShader, uniforms: u, ...opts });
}

export function createGfx(canvas, { headless = false } = {}) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: headless });
  r.autoClear = false;
  r.toneMapping = THREE.NoToneMapping;
  const tri = new THREE.BufferGeometry();
  tri.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const cam = new THREE.Camera();
  const targets = new Set();

  const g = {
    THREE, r, W: 2, H: 2, aspect: 1,
    // scale is relative to the canvas; w/h make it fixed. HalfFloat = HDR by default.
    target({ scale = 1, w = 0, h = 0, samples = 0, depth = false, type = THREE.HalfFloatType, mips = false } = {}) {
      const t = new THREE.WebGLRenderTarget(w || Math.max(1, Math.round(g.W * scale)), h || Math.max(1, Math.round(g.H * scale)), {
        samples, depthBuffer: depth, type, minFilter: mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter,
        magFilter: THREE.LinearFilter, generateMipmaps: mips,
      });
      t._scale = scale; t._fixed = !!w;
      targets.add(t);
      return t;
    },
    pass(body, uniforms = {}, opts = {}) {
      const m = material(PASS_VS, PASS_HEAD + body, { uRes: new THREE.Vector2(), uTime: 0, ...uniforms }, { depthTest: false, depthWrite: false, ...opts });
      const mesh = new THREE.Mesh(tri, m); mesh.frustumCulled = false;
      const scene = new THREE.Scene(); scene.add(mesh);
      return {
        u: m.uniforms, material: m,
        render(target, clear = false) {
          m.uniforms.uRes.value.set(target ? target.width : g.W, target ? target.height : g.H);
          r.setRenderTarget(target || null); if (clear) r.clear(); r.render(scene, cam);
        },
      };
    },
    draw(scene, camera, target, { clear = true, color = 0x000000 } = {}) {
      r.setRenderTarget(target || null);
      if (clear) { r.setClearColor(color, 1); r.clear(true, true, false); }
      r.render(scene, camera);
    },
    copy(src, dst) { copyPass.u.tA.value = src.texture; copyPass.render(dst); },
    resize(w, h) {
      g.W = w; g.H = h; g.aspect = w / h; r.setSize(w, h, false);
      for (const t of targets) if (!t._fixed) t.setSize(Math.max(1, Math.round(w * t._scale)), Math.max(1, Math.round(h * t._scale)));
    },
  };
  const downPass = g.pass("uniform sampler2D tA; uniform vec2 uPx; void main(){ vec3 c=vec3(0); for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++) c+=texture(tA,vUv+vec2(x,y)*uPx).rgb; o=vec4(c/9.,1.); }", { tA: null, uPx: new THREE.Vector2() });
  g.shrink = (src, dst) => { downPass.u.tA.value = src.texture; downPass.u.uPx.value.set(1 / (3 * dst.width), 1 / (3 * dst.height)); downPass.render(dst); };
  const copyPass = g.pass("uniform sampler2D tA; void main(){ o=texture(tA,vUv); }", { tA: null });

  // ---- post: bloom chain + ACES + grade + grain ----
  const LEVELS = 5, down = [], up = [];
  for (let i = 0; i < LEVELS; i++) { down.push(g.target({ scale: 1 / (2 << i) })); up.push(g.target({ scale: 1 / (2 << i) })); }
  const dPass = g.pass(`uniform sampler2D tA; uniform vec2 uPx; uniform float uThr,uFirst;
    vec3 s(vec2 d){ vec3 c=min(max(texture(tA,vUv+d*uPx).rgb,0.),vec3(300.)); if(uFirst>.5){ float l=max(c.r,max(c.g,c.b)); c*=max(0.,l-uThr)/max(l,1e-4); } return c; }
    void main(){ vec3 c=s(vec2(0))*.25+(s(vec2(-1,-1))+s(vec2(1,-1))+s(vec2(-1,1))+s(vec2(1,1)))*.1875; o=vec4(c,1.); }`, { tA: null, uPx: new THREE.Vector2(), uThr: 1, uFirst: 0 });
  const uPass = g.pass(`uniform sampler2D tA,tB; uniform vec2 uPx; uniform float uR;
    void main(){ vec3 c=vec3(0); for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){ float w=(x==0?2.:1.)*(y==0?2.:1.); c+=w*texture(tA,vUv+vec2(x,y)*uPx).rgb; } o=vec4(texture(tB,vUv).rgb+c/16.*uR,1.); }`, { tA: null, tB: null, uPx: new THREE.Vector2(), uR: 0.85 });
  const fPass = g.pass(COLOR + HASH + `uniform sampler2D tA,tB; uniform float uExp,uBloom,uCon,uSat,uVig,uGrain,uTone;
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
    void main(){ vec2 d=vUv-.5; vec3 c=max(texture(tA,vUv).rgb,0.)+texture(tB,vUv).rgb*uBloom; c=uTone>.5?toSrgb(aces(c*uExp)):c*uExp;
      c=(c-.5)*uCon+.5; c=mix(vec3(luma(c)),c,uSat); c*=1.-uVig*smoothstep(.25,1.05,length(d*vec2(uRes.x/uRes.y,1.)*1.1));
      c+=(hash13(vec3(gl_FragCoord.xy,fract(uTime*7.3)*97.))-.5)*uGrain; o=vec4(clamp(c,0.,1.),1.); }`,
    { tA: null, tB: null, uExp: 1, uBloom: 0, uCon: 1, uSat: 1, uVig: 0, uGrain: 0, uTone: 1 });
  g.post = (src, dst, { exposure = 1, bloom = 0.2, threshold = 1, contrast = 1, saturation = 1, vignette = 0.15, grain = 0.02, time = 0, tone = "aces" } = {}) => {
    let cur = src;
    for (let i = 0; i < LEVELS; i++) {
      dPass.u.tA.value = cur.texture; dPass.u.uPx.value.set(1 / cur.width, 1 / cur.height); dPass.u.uFirst.value = i ? 0 : 1; dPass.u.uThr.value = threshold;
      dPass.render(down[i]); cur = down[i];
    }
    let acc = down[LEVELS - 1];
    for (let i = LEVELS - 2; i >= 0; i--) {
      uPass.u.tA.value = acc.texture; uPass.u.tB.value = down[i].texture; uPass.u.uPx.value.set(1 / acc.width, 1 / acc.height);
      uPass.render(up[i]); acc = up[i];
    }
    fPass.u.tA.value = src.texture; fPass.u.tB.value = up[0].texture;
    fPass.u.uExp.value = exposure; fPass.u.uBloom.value = bloom; fPass.u.uCon.value = contrast; fPass.u.uSat.value = saturation;
    fPass.u.uVig.value = vignette; fPass.u.uGrain.value = grain; fPass.u.uTime.value = time; fPass.u.uTone.value = tone === "none" ? 0 : 1;
    fPass.render(dst);
  };

  // Final blit to screen with +-1 LSB dither (kills banding) and fade to black.
  const pPass = g.pass(HASH + "uniform sampler2D tA; uniform float uBlack; void main(){ vec3 c=texture(tA,vUv).rgb*(1.-uBlack); float n=hash13(vec3(gl_FragCoord.xy,fract(uTime)*61.))+hash13(vec3(gl_FragCoord.xy,fract(uTime)*61.+7.))-1.; o=vec4(c+n/255.,1.); }", { tA: null, uBlack: 0 });
  g.present = (src, time = 0, black = 0) => { pPass.u.tA.value = src.texture; pPass.u.uTime.value = time; pPass.u.uBlack.value = black; pPass.render(null); };
  return g;
}
