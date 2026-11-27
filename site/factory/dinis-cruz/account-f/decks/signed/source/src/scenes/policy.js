// Scene 3: "Five things no agent here may do." A current of agents (particles) flows across the screen and steers
// round five glowing zones: the five rules every keeper of this site must keep, word for word from policy/abp.json.
import * as THREE from "three";
import { material } from "../gfx.js";
import { ease, rng, clamp } from "../util.js";

const RULES = ["push to main", "print, commit or read a private key or token", "name a private person without their consent",
  "invent a fact, a price or a customer", "add a server, cookies or tracking"];
const WRAP = ["push to\nmain", "print, commit or\nread a private\nkey or token", "name a private\nperson without\ntheir consent", "invent a fact,\na price or\na customer", "add a server,\ncookies or\ntracking"];

export default {
  id: "policy",
  title: "Five rules",
  enterWith: "daybreak",
  beats: [{ dur: 6, hold: 3 }, { dur: 3.5, hold: 5 }],
  notes: ["The agent that looks after this site (its keeper) works under five rules written in its Agent Behaviour Policy.", "Anything the policy does not allow is not allowed. Today the agents follow these rules and their history is reviewed; the pipeline checks what it can, not yet every rule."],
  create(ctx) {
    const { gfx, view } = ctx, V = view.portrait, M = V ? 72 : 140;
    const Z = V ? [[300, 700, 140], [790, 820, 140], [320, 1080, 150], [770, 1210, 150], [400, 1360, 125]]
                : [[380, 640, 150], [760, 860, 140], [1070, 590, 160], [1430, 830, 150], [1650, 520, 135]];
    const hdr = gfx.target(), R = rng(9), N = V ? 1100 : 1400;
    // background and zones in one pass, in design units
    const bg = gfx.pass(`uniform vec4 uView; uniform vec3 uZ[5]; uniform float uOn[5]; uniform float uPulse;
      void main(){
        vec2 d=vec2(uView.x+vUv.x*uView.z, uView.y+(1.-vUv.y)*uView.w);
        vec3 c=mix(vec3(.004,.006,.010),vec3(.012,.020,.026),vUv.y);
        for(int i=0;i<5;i++){ float r=length(d-uZ[i].xy), R=uZ[i].z*uOn[i];
          c+=vec3(.35,.08,.03)*smoothstep(R,R*.2,r)*.35*uOn[i];                         // a warm interior
          c+=vec3(1.,.34,.12)*exp(-pow((r-R)/2.2,2.))*1.8*uOn[i];                         // the boundary line
          c+=vec3(1.,.4,.15)*exp(-abs(r-R)/26.)*.22*uOn[i]*(1.+.3*sin(uTime*2.+float(i))); } // its glow
        o=vec4(c,1.); }`, { uView: new THREE.Vector4(), uZ: { value: Z.map(([x, y, r]) => new THREE.Vector3(x, y, r)) }, uOn: { value: [0, 0, 0, 0, 0] }, uPulse: 0 });
    // the agents: CPU-stepped particles, drawn as soft glowing quads in design space
    const P = new Float32Array(N * 4); // x, y, vx, vy
    const spawn = (i, anywhere) => {
      const a = anywhere ? R() : 0, b = R();
      if (V) { P[i * 4] = view.x0 + b * view.w; P[i * 4 + 1] = anywhere ? view.y0 + a * view.h : view.y0 - 20; }
      else { P[i * 4] = anywhere ? view.x0 + a * view.w : view.x0 - 20; P[i * 4 + 1] = view.y0 + b * view.h; }
      P[i * 4 + 2] = P[i * 4 + 3] = 0;
    };
    const geo = new THREE.InstancedBufferGeometry(), quad = new THREE.PlaneGeometry(1, 1);
    geo.index = quad.index; geo.setAttribute("position", quad.getAttribute("position"));
    const iA = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4); iA.setUsage(THREE.DynamicDrawUsage); geo.setAttribute("iA", iA); geo.instanceCount = N;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const pm = material(`precision highp float; in vec3 position; in vec4 iA; uniform mat4 projectionMatrix,modelViewMatrix; out vec2 vQ; out float vS; out float vY;
        void main(){ vQ=position.xy; vS=iA.z; vY=iA.y; float a=atan(iA.w,iA.z+1e-4); vec2 q=position.xy*vec2(26.,2.2); q=mat2(cos(a),sin(a),-sin(a),cos(a))*q;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(iA.xy+q*1.6,0.,1.); }`,
      `precision highp float; in vec2 vQ; in float vS; in float vY; out vec4 o; uniform vec2 uBand; void main(){ float d=length(vQ*2.); float a=exp(-d*d*3.)*smoothstep(uBand.x,uBand.y,vY); o=vec4(vec3(.78,.86,1.)*a*1.1,a); }`,
      { uBand: new THREE.Vector2(V ? 470 : 300, V ? 560 : 420) }, { transparent: true, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const parts = new THREE.Mesh(geo, pm); parts.frustumCulled = false;
    const pscene = new THREE.Scene(); pscene.add(parts);
    let seeded = false;
    const layer = ctx.overlay();
    const h1 = layer.add(ctx.text(V ? "Five things no agent\nhere may do." : "Five things no agent here may do.", { x: M, y: V ? 200 : 110, size: V ? 92 : 96, font: "display", leading: 1.05 }));
    const h2 = layer.add(ctx.text(V ? "Anything the policy\ndoes not allow\nis not allowed." : "Anything the policy does not\nallow is not allowed.", { x: M, y: V ? 200 : 110, size: V ? 92 : 96, font: "display", leading: 1.05 }));
    const src = layer.add(ctx.text("the keeper's rules, from this site's policy/abp.json", { x: M + 4, y: V ? 420 : 245, size: V ? 30 : 28, font: "mono", color: "#9aa8a1" }));
    const labels = Z.map(([x, y], i) => layer.add(ctx.text(WRAP[i], { x, y: y - WRAP[i].split("\n").length * (V ? 19 : 18), size: V ? 32 : 30, font: "text", color: "#ffd9c4", leading: 1.2, align: "center" })));
    let lastOn = -1;
    return {
      update(s) {
        if (!seeded) { for (let i = 0; i < N; i++) spawn(i, true); seeded = true; }
        bg.u.uTime.value = s.t; bg.u.uView.value.set(view.x0, view.y0, view.w, view.h);
        const on = Z.map((_, i) => ease.outBack(s.k(0, 0.8 + i * 0.75, 1.5 + i * 0.75, ease.lin)));
        bg.u.uOn.value = on;
        const lit = on.filter((v) => v > 0.2).length - 1;
        if (lit > lastOn && s.beat === 0 && s.dir > 0) { for (let i = lastOn + 1; i <= lit; i++) ctx.sound("select", { g: 0.35, rate: 0.8 + i * 0.07, pan: (Z[i][0] / (V ? 1080 : 1920)) * 1.4 - 0.7 }); lastOn = lit; }
        if (s.beat === 0 && s.p[0] < 0.05) lastOn = -1;
        // step the current: a steady flow plus a gentle wobble, pushed round each zone
        const dt = Math.min(s.dt, 1 / 30), sp = V ? 170 : 210, flow = V ? [0, 1] : [1, 0];
        for (let i = 0; i < N; i++) {
          const o = i * 4; let x = P[o], y = P[o + 1], vx = P[o + 2], vy = P[o + 3];
          let dx = flow[0] * sp + Math.sin(y * 0.011 + s.t * 0.7 + i) * 40, dy = flow[1] * sp + Math.sin(x * 0.009 + s.t * 0.6 + i * 0.3) * 40;
          for (let z = 0; z < 5; z++) {
            const [cx, cy, r] = Z[z], ex = x - cx, ey = y - cy, d = Math.hypot(ex, ey) + 1e-3, R0 = r * on[z] + 26;
            if (d < R0 + 70) { const k = clamp((R0 + 70 - d) / 70); const f = k * k * 900; dx += (ex / d) * f; dy += (ey / d) * f;
              const tx = -ey / d, ty = ex / d, side = Math.sign(tx * flow[0] + ty * flow[1]) || 1; dx += tx * side * k * 260; dy += ty * side * k * 260; }
          }
          vx += (dx - vx) * Math.min(1, dt * 3); vy += (dy - vy) * Math.min(1, dt * 3); x += vx * dt; y += vy * dt;
          if (x > view.x1 + 30 || y > view.y1 + 30 || x < view.x0 - 60 || y < view.y0 - 60) { spawn(i, false); continue; }
          P[o] = x; P[o + 1] = y; P[o + 2] = vx; P[o + 3] = vy;
          iA.setXYZW(i, x, y, vx, vy);
        }
        iA.needsUpdate = true;
        h1.show(s.k(0, 0.4, 2.2, ease.lin), { stagger: 0.3, q: s.k(1, 0, 0.8, ease.lin) });
        h2.show(s.k(1, 0.8, 2.8, ease.lin), { stagger: 0.3 });
        src.show(s.k(0, 2.2, 3.2, ease.lin), { style: "fade", q: s.k(1, 0, 0.6, ease.lin) });
        labels.forEach((l, i) => l.show(clamp(on[i] * 1.2 - 0.3), { style: "fade" }));
      },
      render(out, s) {
        bg.render(hdr); gfx.draw(pscene, view.cam, hdr, { clear: false });
        gfx.post(hdr, out, { bloom: 0.5, threshold: 1, exposure: 1, vignette: 0.25, grain: 0.02, time: s.t });
        layer.render(out);
      },
    };
  },
};
