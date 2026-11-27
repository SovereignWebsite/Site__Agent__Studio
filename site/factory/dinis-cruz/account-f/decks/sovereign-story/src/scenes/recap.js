// Scene 5: "Every step, kept." Live snapshots of the scenes already shown (taken as the presenter left each one)
// lie along an exponential curve; the camera rides to the latest, a marquee frames it, then pulls back to the
// empty frames rising ahead. After the original's "You are here".
import * as THREE from "three";
import { material } from "../gfx.js";
import { SelectBox } from "../view.js";
import { ease, lerp } from "../util.js";

const SLIDES = ["plain", "own", "split", "field"], BEFORE = 3, AFTER = 9;
const W = 16, H = 9, GAP = 1.6, A = 4, S = 18;

export default {
  id: "recap",
  title: "Every step, kept",
  enterWith: "iris",
  beats: [{ dur: 5.5, hold: 2.5 }, { dur: 4.5, hold: 4 }],
  notes: ["Every step so far, as it was when we left it.", "The history is yours too, and there is room ahead."],
  create(ctx) {
    const { gfx, view } = ctx;
    // arc-length table of y = A e^(x/S)
    const N = 6000, X0 = -150, X1 = 62, xs = new Float32Array(N), ls = new Float32Array(N);
    for (let i = 0, L = 0; i < N; i++) {
      const x = X0 + ((X1 - X0) * i) / (N - 1); xs[i] = x;
      if (i) { const xp = xs[i - 1]; L += Math.hypot(x - xp, A * Math.exp(x / S) - A * Math.exp(xp / S)); } ls[i] = L;
    }
    const at = (s) => {                                 // arc length -> point and tangent
      let lo = 0, hi = N - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ls[m] < s) lo = m; else hi = m; }
      const x = xs[lo] + (xs[hi] - xs[lo]) * ((s - ls[lo]) / Math.max(1e-6, ls[hi] - ls[lo]));
      const y = A * Math.exp(x / S), dy = (A / S) * Math.exp(x / S), l = Math.hypot(1, dy);
      return { x, y, tx: 1 / l, ty: dy / l };
    };
    const sOf = (x) => { let i = 0; while (i < N - 1 && xs[i] < x) i++; return ls[i]; };
    const STEP = W + GAP, s0 = sOf(-16) - (SLIDES.length - 1) * STEP;  // the latest slide sits just before the bend
    const slotS = (i) => s0 + i * STEP;

    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, 0.1, 600);
    const ms = gfx.target({ samples: 4, depth: true });
    const plane = new THREE.PlaneGeometry(W, H);
    const VS = `precision highp float; in vec3 position; in vec2 uv; uniform mat4 projectionMatrix,modelViewMatrix; out vec2 vUv;
      void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
    const FS = `precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uT; uniform float uHas,uA,uLit;
      void main(){
        vec2 e=min(vUv,1.-vUv)*vec2(16.,9.);                       // distance to the edge, in slide units
        float edge=min(e.x,e.y);
        if(uHas>.5){ vec3 c=texture(uT,vUv).rgb*(.55+.45*uLit); c=mix(vec3(.86),c,smoothstep(.05,.13,edge)); o=vec4(c*uA,uA); return; }
        float per=(vUv.x<.02||vUv.x>.98)?vUv.y*9.:vUv.x*16.;       // dashes along the border
        float dash=step(.5,fract(per*1.6))*(1.-smoothstep(.06,.12,edge));
        vec3 c=vec3(.05,.07,.08)+vec3(.62,.78,.7)*dash; float a=max(.6,dash)*uA; o=vec4(c*a,a);
      }`;
    const slots = [];
    for (let i = -BEFORE; i < SLIDES.length + AFTER; i++) {
      const id = SLIDES[i], m = material(VS, FS, { uT: null, uHas: id ? 1 : 0, uA: 1, uLit: 1 }, { transparent: true, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(plane, m), pt = at(slotS(i) + W / 2);
      mesh.position.set(pt.x - pt.ty * H * 0.5, pt.y + pt.tx * H * 0.5, 0);   // stand on the curve, facing the camera
      mesh.rotation.z = Math.atan2(pt.ty, pt.tx);
      scene.add(mesh); slots.push({ i, id, mesh, m });
    }
    // the curve itself, as a thin glowing line
    const pts = []; for (let s = slotS(-BEFORE) - 4; s < slotS(SLIDES.length + AFTER) + 4; s += 0.5) { const p = at(s); pts.push(new THREE.Vector3(p.x, p.y, -0.02)); }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(lineGeo, material(`precision highp float; in vec3 position; uniform mat4 projectionMatrix,modelViewMatrix; void main(){ gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      `precision highp float; out vec4 o; void main(){ o=vec4(.55,.9,.7,1.); }`));
    scene.add(line);

    const layer = ctx.overlay(), box = layer.add(new SelectBox(view, "#8fe0b4"));
    const here = layer.add(ctx.text("You are here", { x: 0, y: 0, size: 34, font: "mono", color: "#8fe0b4" }));
    const t1 = layer.add(ctx.text("Every step, kept.", { x: 140, y: 110, size: 96, font: "display" }));
    const t2 = layer.add(ctx.text("The history is yours.", { x: 140, y: 110, size: 96, font: "display" }));
    const last = SLIDES.length - 1, v3 = new THREE.Vector3();
    const project = (x, y) => { v3.set(x, y, 0).project(cam); return [view.x0 + (v3.x * 0.5 + 0.5) * view.w, view.y0 + (0.5 - v3.y * 0.5) * view.h]; };
    return {
      update(s) {
        for (const sl of slots) { const t = sl.id && ctx.snapshots[sl.id]; sl.m.uniforms.uT.value = t ? t.texture : null; sl.m.uniforms.uHas.value = t ? 1 : 0; }
        // ride from the first slide to the latest, then pull back and look up the curve
        const ride = ease.ioExpo(s.k(0, 0, 4.6, ease.lin)), up = s.k(1, 0, 4.2, ease.io3);
        const sTarget = lerp(slotS(0) + W / 2, slotS(last) + W / 2, ride);
        const p = at(sTarget), ahead = at(slotS(last + 3));
        const tx = lerp(p.x + 2, (p.x + ahead.x) / 2 - 2, up), ty = lerp(p.y + H * 0.5 + 3.2, (p.y + ahead.y) / 2 + 3, up);
        const pull = Math.sin(Math.PI * ride) * 14;
        cam.aspect = gfx.aspect; cam.fov = lerp(32, 44, up);
        cam.position.set(tx + s.mouse.x * 1.5, ty + s.mouse.y * 1.0, lerp(36 + pull, 64, up)); cam.lookAt(tx, ty, 0); cam.updateProjectionMatrix();
        for (const sl of slots) sl.m.uniforms.uLit.value = sl.i === last ? 1 : lerp(0.55, 0.85, up);
        // frame the latest slide with the marquee once the camera lands
        const sel = s.k(0, 4.4, 5.1, ease.lin) * (1 - s.k(1, 0, 0.8, ease.lin));
        const m = slots.find((x) => x.i === last).mesh, hw = W / 2, hh = H / 2, cs = Math.cos(m.rotation.z), sn = Math.sin(m.rotation.z);
        const corners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([a, b]) => project(m.position.x + a * cs - b * sn, m.position.y + a * sn + b * cs));
        const cx = corners.reduce((a, c) => a + c[0], 0) / 4, cy = corners.reduce((a, c) => a + c[1], 0) / 4;
        const bw = Math.hypot(corners[1][0] - corners[0][0], corners[1][1] - corners[0][1]) + 20, bh = Math.hypot(corners[2][0] - corners[1][0], corners[2][1] - corners[1][1]) + 20;
        const rot = Math.atan2(corners[1][1] - corners[0][1], corners[1][0] - corners[0][0]);
        if (sel > 0) box.set(cx - bw / 2, cy - bh / 2, bw, bh, sel, rot); else box.alpha(0);
        here.x = corners[3][0] - 6; here.y = corners[3][1] - 78; here.show(sel, { style: "fade" });
        t1.show(s.k(0, 3.6, 5.2, ease.lin), { stagger: 0.35, q: s.k(1, 0, 0.9, ease.lin) });
        t2.show(s.k(1, 1.0, 2.8, ease.lin), { stagger: 0.35 });
      },
      render(out, s) {
        gfx.draw(scene, cam, ms, { color: 0x06080b });
        gfx.post(ms, out, { bloom: 0.25, threshold: 0.95, exposure: 1.15, tone: "none", contrast: 1, vignette: 0.3, grain: 0.015, time: s.t });
        layer.render(out);
      },
    };
  },
};
