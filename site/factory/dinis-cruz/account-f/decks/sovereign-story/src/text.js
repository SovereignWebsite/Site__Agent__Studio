// Word-instanced text: Canvas2D layout + raster at device resolution, one instanced quad per word,
// per-word animation (dy, alpha, scale) and line clipping for masked "rise" reveals.
// The original deck does this per GLYPH with blur too; per-word keeps the starter short.
import * as THREE from "three";
import { material } from "./gfx.js";
import { clamp, ease, hex } from "./util.js";

export const FONTS = {
  display: "600 {px}px 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
  text: "400 {px}px 'Inter', 'Helvetica Neue', Arial, sans-serif",
  mono: "500 {px}px 'JetBrains Mono', ui-monospace, Menlo, monospace",
};
const font = (role, px) => (FONTS[role] || role).replace("{px}", px);
const measure = document.createElement("canvas").getContext("2d");

const VS = `precision highp float; in vec2 position; in vec4 iRect,iUv,iAnim,iLine; uniform mat4 projectionMatrix,modelViewMatrix;
out vec2 vUv; out float vA; out vec2 vP; out vec2 vLine;
void main(){ vec2 c=iRect.xy+iRect.zw*.5; vec2 p=c+position*iRect.zw*iAnim.z+vec2(0.,iAnim.x); vP=p; vUv=iUv.xy+(position+.5)*iUv.zw; vA=iAnim.y; vLine=iLine.xy;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,0.,1.); }`;
const FS = `precision highp float; in vec2 vUv; in float vA; in vec2 vP; in vec2 vLine; out vec4 o; uniform sampler2D tA; uniform vec3 uC; uniform float uAlpha,uClip;
void main(){ if(uClip>.5&&(vP.y<vLine.x||vP.y>vLine.y)) discard; float a=texture(tA,vUv).a*vA*uAlpha; o=vec4(uC*a,a); }`;

const QUAD = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
})();

export class TextBlock {
  constructor(str, { x = 0, y = 0, size = 64, font: f = "display", color = "#ffffff", align = "left", leading = 1.15, getPpu }) {
    Object.assign(this, { x, y, size, font: f, align, leading, getPpu });
    this.canvas = document.createElement("canvas");
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.generateMipmaps = false; this.tex.minFilter = THREE.LinearFilter; this.tex.flipY = false;
    this.mat = material(VS, FS, { tA: this.tex, uC: new THREE.Vector3(...hex(color)), uAlpha: 1, uClip: 1 },
      { transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
    this.mesh = new THREE.Mesh(new THREE.InstancedBufferGeometry(), this.mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 10;
    this.set(str);
  }
  set(str) { this.str = str; this._layout(); this._raster(); return this; }
  _layout() {
    measure.font = font(this.font, this.size);
    const lines = this.str.split("\n"), lh = this.size * this.leading;
    this.words = [];
    lines.forEach((line, li) => {
      const parts = line.split(" ").filter(Boolean), space = measure.measureText(" ").width;
      const widths = parts.map((p) => measure.measureText(p).width);
      const total = widths.reduce((a, b) => a + b, 0) + space * Math.max(0, parts.length - 1);
      let cx = this.align === "center" ? -total / 2 : this.align === "right" ? -total : 0;
      parts.forEach((p, i) => { this.words.push({ t: p, x: cx, y: li * lh, w: widths[i], line: li }); cx += widths[i] + space; });
    });
    this.height = lines.length * lh;
    const n = this.words.length, geo = new THREE.InstancedBufferGeometry();
    geo.index = QUAD.index; geo.setAttribute("position", QUAD.getAttribute("position"));
    for (const name of ["iRect", "iUv", "iAnim", "iLine"]) geo.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
    geo.instanceCount = n;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6); // 2D positions: skip three's auto bounds
    this.mesh.geometry.dispose(); this.mesh.geometry = geo;
  }
  _raster() {
    const ppu = Math.min(6, this.getPpu ? this.getPpu() : 1); this._ppu = ppu;
    const pad = this.size * 0.3, rowH = this.size * this.leading + pad * 2;
    let W = 0; for (const w of this.words) W = Math.max(W, w.w + pad * 2);
    const cw = Math.ceil(W * ppu) + 2, ch = Math.ceil(rowH * this.words.length * ppu) + 2;
    if (cw !== this.canvas.width || ch !== this.canvas.height) {           // a GPU texture cannot change size: replace it
      this.canvas.width = cw; this.canvas.height = ch;
      this.tex.dispose(); this.tex = new THREE.CanvasTexture(this.canvas);
      this.tex.generateMipmaps = false; this.tex.minFilter = THREE.LinearFilter; this.tex.flipY = false;
      this.mat.uniforms.tA.value = this.tex;
    }
    const c = this.canvas.getContext("2d");
    c.clearRect(0, 0, this.canvas.width, this.canvas.height); c.fillStyle = "#fff"; c.textBaseline = "alphabetic";
    c.font = font(this.font, this.size * ppu);
    const rect = this.mesh.geometry.attributes.iRect, uv = this.mesh.geometry.attributes.iUv, ln = this.mesh.geometry.attributes.iLine;
    const lh = this.size * this.leading;
    this.words.forEach((w, i) => {
      const oy = i * rowH; c.fillText(w.t, pad * ppu, (oy + pad + this.size * 0.95) * ppu);
      rect.setXYZW(i, w.x - pad, w.y - pad, w.w + pad * 2, rowH);
      uv.setXYZW(i, 0, (oy * ppu) / this.canvas.height, ((w.w + pad * 2) * ppu) / this.canvas.width, (rowH * ppu) / this.canvas.height);
      ln.setXYZW(i, w.y - this.size * 0.1, w.y + lh + this.size * 0.05, 0, 0); // local line box for clipping
    });
    rect.needsUpdate = uv.needsUpdate = ln.needsUpdate = true; this.tex.needsUpdate = true;
  }
  width() { let w = 0; for (const x of this.words) w = Math.max(w, x.x + x.w); return w; }
  refresh() { if (Math.abs((this.getPpu ? this.getPpu() : 1) - this._ppu) > 0.01) this._raster(); }
  // fn(word, out{dy,alpha,scale}, index)
  animate(fn) {
    this.refresh();
    const a = this.mesh.geometry.attributes.iAnim, o = {};
    this.words.forEach((w, i) => { o.dy = 0; o.alpha = 1; o.scale = 1; fn(w, o, i); a.setXYZW(i, o.dy, o.alpha, o.scale, 0); });
    a.needsUpdate = true; this.mesh.position.set(this.x, this.y, 0); this.mesh.visible = true;
    return this;
  }
  // Standard reveal: p = in-ramp 0..1, q = out-ramp 0..1. style "rise" (masked) or "fade".
  show(p, { q = 0, style = "rise", stagger = 0.5 } = {}) {
    if (p <= 0 || q >= 1) { this.mesh.visible = false; return this; }
    const n = this.words.length;
    this.mat.uniforms.uClip.value = style === "rise" ? 1 : 0;
    return this.animate((w, o, i) => {
      const off = n > 1 ? (i / (n - 1)) * stagger : 0;
      const a = ease.out4(clamp((p - off) / (1 - stagger))), b = ease.in3(clamp((q - off) / (1 - stagger)));
      if (style === "rise") { o.dy = (1 - a) * this.size * 1.15 - b * this.size * 1.15; o.alpha = a > 0 ? 1 : 0; }
      else { o.alpha = a * (1 - b); o.dy = (1 - a) * 12; }
    });
  }
}
