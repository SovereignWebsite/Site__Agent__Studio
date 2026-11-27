// 1920x1080 design space, letterboxed by EXTENSION (other aspects see more, never distorted).
// y grows downward, like CSS. Use view.x0/x1/y0/y1 to hug real screen edges.
import * as THREE from "three";

export function createView() {
  const cam = new THREE.OrthographicCamera(0, 1920, 0, 1080, -10, 10);
  const v = {
    cam, x0: 0, y0: 0, x1: 1920, y1: 1080, w: 1920, h: 1080, scale: 1,
    resize(pw, ph) {
      const s = Math.min(pw / 1920, ph / 1080);
      v.scale = s; v.w = pw / s; v.h = ph / s;
      v.x0 = (1920 - v.w) / 2; v.y0 = (1080 - v.h) / 2; v.x1 = v.x0 + v.w; v.y1 = v.y0 + v.h;
      Object.assign(cam, { left: v.x0, right: v.x1, top: v.y0, bottom: v.y1 });
      cam.updateProjectionMatrix();
    },
    // client px -> design units
    fromClient(cx, cy, rect) { return [v.x0 + ((cx - rect.left) / rect.width) * v.w, v.y0 + ((cy - rect.top) / rect.height) * v.h]; },
  };
  return v;
}

// A 2D layer drawn with the view camera.
export class Overlay {
  constructor(gfx, view) { this.gfx = gfx; this.view = view; this.scene = new THREE.Scene(); }
  add(...items) { for (const it of items) this.scene.add(it.mesh || it); return items[0]; }
  render(target) { this.gfx.draw(this.scene, this.view.cam, target, { clear: false }); }
}

// Flat-colour rectangle in design units (backgrounds, template bars, rules, carets).
import { material } from "./gfx.js";
import { hex } from "./util.js";
const RECT_VS = `precision highp float; in vec3 position; uniform mat4 projectionMatrix; uniform vec4 uR; void main(){ vec2 p=uR.xy+(position.xy+.5)*uR.zw; gl_Position=projectionMatrix*vec4(p,0.,1.); }`;
const RECT_FS = `precision highp float; out vec4 o; uniform vec3 uC; uniform float uA; void main(){ o=vec4(uC*uA,uA); }`;
export class Rect {
  constructor({ x = 0, y = 0, w = 10, h = 10, color = "#ffffff", order = 0 } = {}) {
    this.mat = material(RECT_VS, RECT_FS, { uR: new THREE.Vector4(x, y, w, h), uC: new THREE.Vector3(...hex(color)), uA: 1 },
      { transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = order;
  }
  set(x, y, w, h) { this.mat.uniforms.uR.value.set(x, y, w, h); return this; }
  alpha(a) { this.mat.uniforms.uA.value = a; this.mesh.visible = a > 0.001; return this; }
}
