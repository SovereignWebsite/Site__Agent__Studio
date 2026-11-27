// 1920x1080 design space, letterboxed by EXTENSION (other aspects see more, never distorted).
// y grows downward, like CSS. Use view.x0/x1/y0/y1 to hug real screen edges.
import * as THREE from "three";

export function createView() {
  const cam = new THREE.OrthographicCamera(0, 1920, 0, 1080, -10, 10);
  const v = {
    cam, x0: 0, y0: 0, x1: 1920, y1: 1080, w: 1920, h: 1080, scale: 1, DW: 1920, DH: 1080, portrait: false,
    // A portrait screen (taller than wide) gets its own 1080x1920 design space, and scenes lay themselves out for it.
    resize(pw, ph) {
      v.portrait = ph > pw; v.DW = v.portrait ? 1080 : 1920; v.DH = v.portrait ? 1920 : 1080;
      const s = Math.min(pw / v.DW, ph / v.DH);
      v.scale = s; v.w = pw / s; v.h = ph / s;
      v.x0 = (v.DW - v.w) / 2; v.y0 = (v.DH - v.h) / 2; v.x1 = v.x0 + v.w; v.y1 = v.y0 + v.h;
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

// ---- design-space primitives (y down, 1920x1080 units). Drawn after the grade, premultiplied alpha. ----
import { material } from "./gfx.js";
import { hex } from "./util.js";
const PLANE = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1); return g;
})();
const PVS = `precision highp float; in vec2 position; uniform mat4 projectionMatrix,modelViewMatrix; out vec2 vL;
void main(){ vL=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,0.,1.); }`;
const PREMUL = { transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };

export class Rect {
  constructor(color = "#ffffff") {
    this.mat = material(PVS, `precision highp float; in vec2 vL; out vec4 o; uniform vec3 uC; uniform float uA; void main(){ o=vec4(uC*uA,uA); }`,
      { uC: new THREE.Vector3(...hex(color)), uA: 1 }, PREMUL);
    this.mesh = new THREE.Mesh(PLANE, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
  }
  set(x, y, w, h) { this.mesh.position.set(x + w / 2, y + h / 2, 0); this.mesh.scale.set(Math.max(w, 1e-3), Math.max(h, 1e-3), 1); return this; }
  alpha(a) { this.mat.uniforms.uA.value = a; this.mesh.visible = a > 0.001; return this; }
}

// The design-tool selection marquee from the original deck: outline, eight handles, a faint fill.
export class SelectBox {
  constructor(view, color = "#2b5cff") {
    this.view = view;
    this.mat = material(PVS, `precision highp float; in vec2 vL; out vec4 o; uniform vec2 uSize,uHalf; uniform vec3 uC; uniform float uA,uPx,uLw,uR;
      float sdBox(vec2 p,vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }
      void main(){ vec2 p=vL*uSize; float aa=uPx*.75; float d=sdBox(p,uHalf);
        float line=1.-smoothstep(uLw*.5-aa,uLw*.5+aa,abs(d)); float a=max(line,d<0.?.06:0.); float white=0.;
        for(int i=0;i<8;i++){ vec2 c=i<4?vec2((i==0||i==3)?-1.:1.,i<2?-1.:1.)*uHalf:(i==4?vec2(0.,-uHalf.y):i==5?vec2(uHalf.x,0.):i==6?vec2(0.,uHalf.y):vec2(-uHalf.x,0.));
          float r=length(p-c); float disc=1.-smoothstep(uR-aa,uR+aa,r); float ring=1.-smoothstep(uLw*.5-aa,uLw*.5+aa,abs(r-uR));
          white=max(white,disc*(1.-ring)); line=max(line,ring); a=max(a,disc); }
        // rotation knob on a stem above the top edge, as in a design tool
        vec2 kc=vec2(0.,-uHalf.y-30.); float kr=length(p-kc);
        float stem=(1.-smoothstep(uLw*.5-aa,uLw*.5+aa,abs(p.x)))*step(-uHalf.y-30.+uR,p.y)*step(p.y,-uHalf.y);
        float kd=1.-smoothstep(uR-aa,uR+aa,kr), kring=1.-smoothstep(uLw*.5-aa,uLw*.5+aa,abs(kr-uR));
        line=max(line,max(stem,kring)); white=max(white,kd*(1.-kring)); a=max(a,max(stem,kd));
        vec3 c=mix(uC,vec3(1.),white); o=vec4(c*a*uA,a*uA); }`,
      { uSize: new THREE.Vector2(), uHalf: new THREE.Vector2(), uC: new THREE.Vector3(...hex(color)), uA: 1, uPx: 1, uLw: 3, uR: 8 }, PREMUL);
    this.mesh = new THREE.Mesh(PLANE, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6;
  }
  // t: appear progress 0..1 (pops with overshoot)
  set(x, y, w, h, t = 1, rot = 0) {
    const s = t >= 1 ? 1 : 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2, m = 48, u = this.mat.uniforms;
    const W = w * s, H = h * s;
    this.mesh.position.set(x + w / 2, y + h / 2, 0); this.mesh.rotation.z = rot; this.mesh.scale.set(W + m * 2, H + m * 2, 1);
    u.uSize.value.set(W + m * 2, H + m * 2); u.uHalf.value.set(W / 2, H / 2); u.uPx.value = 1 / this.view.scale;
    this.alpha(Math.min(1, t * 3)); return this;
  }
  alpha(a) { this.mat.uniforms.uA.value = a; this.mesh.visible = a > 0.001; return this; }
}
