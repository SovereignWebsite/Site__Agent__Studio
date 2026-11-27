// Scene 2: "Every change is kept." Each commit on dev (from data.json) is a bead on a timeline, sized by the files it
// changed and coloured by the agent named in its Agent: trailer. Beat 2: a thread of light runs from every signed
// commit to its agent's key; the few unsigned, unnamed ones stay grey.
import * as THREE from "three";
import { material } from "../gfx.js";
import { ease, lerp, clamp } from "../util.js";
import DATA from "../data.json";

const AGENT_COLOURS = ["#ffb38a", "#8fe0b4", "#c7b8ff", "#7fc3ff", "#ffd27a"];
const short = (a) => a.split("@")[0];

export default {
  id: "history",
  title: "Every change, kept",
  enterWith: "line",
  beats: [{ dur: 5.5, hold: 2.5 }, { dur: 5, hold: 5 }],
  notes: [`${DATA.commits.length} commits on dev, every one kept.`, `Every commit that names its agent carries a signature: ${DATA.signed} of ${DATA.commits.length}.`],
  create(ctx) {
    const { gfx, view } = ctx, V = view.portrait, M = V ? 72 : 140;
    const ms = gfx.target({ samples: 4, depth: true }), scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(V ? 58 : 34, 1, 0.1, 400);
    const C = DATA.commits, t0 = Date.parse(C[0].t), t1 = Date.parse(C[C.length - 1].t), L = V ? 34 : 60;
    const agents = Object.keys(DATA.agents).sort((a, b) => DATA.agents[b] - DATA.agents[a]);
    const colourOf = (a) => new THREE.Color(a ? AGENT_COLOURS[agents.indexOf(a) % AGENT_COLOURS.length] : "#59616b");
    // bead positions: x = time; a slow helix around the axis keeps close commits apart
    const pos = C.map((c, i) => { const x = ((Date.parse(c.t) - t0) / (t1 - t0) - 0.5) * L, a = i * 2.399963, r = 1.2 + 0.25 * Math.sqrt(c.files);
      return new THREE.Vector3(x, Math.sin(a) * r * 0.55 + 2, Math.cos(a) * r * 0.55); });
    // beads: instanced icospheres
    const sph = new THREE.IcosahedronGeometry(1, 3), geo = new THREE.InstancedBufferGeometry(); geo.index = sph.index;
    geo.setAttribute("position", sph.getAttribute("position")); geo.setAttribute("normal", sph.getAttribute("normal"));
    const iP = new Float32Array(C.length * 4), iC = new Float32Array(C.length * 4);
    C.forEach((c, i) => { iP.set([pos[i].x, pos[i].y, pos[i].z, 0.16 + 0.07 * Math.sqrt(c.files)], i * 4); const col = colourOf(c.agent); iC.set([col.r, col.g, col.b, c.signed ? 1 : 0], i * 4); });
    geo.setAttribute("iP", new THREE.InstancedBufferAttribute(iP, 4)); geo.setAttribute("iC", new THREE.InstancedBufferAttribute(iC, 4));
    geo.setAttribute("iT", new THREE.InstancedBufferAttribute(new Float32Array(C.map((c) => (Date.parse(c.t) - t0) / (t1 - t0))), 1)); geo.instanceCount = C.length;
    const beads = material(
      `precision highp float; in vec3 position,normal; in vec4 iP,iC; in float iT; uniform mat4 projectionMatrix,viewMatrix; uniform float uHead,uSig;
       out vec3 vN,vC; out float vG;
       void main(){ float born=smoothstep(iT-.002,iT+.03,uHead); vec3 p=iP.xyz+position*iP.w*born*(1.+.6*exp(-pow((uHead-iT)*40.,2.)));
         vN=normal; vC=mix(iC.rgb,vec3(.35,.38,.42),uSig*(1.-iC.a)); vG=born*(1.+2.5*exp(-pow((uHead-iT)*30.,2.)))*(1.+uSig*iC.a*.8);
         gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`,
      `precision highp float; in vec3 vN,vC; in float vG; out vec4 o;
       void main(){ float df=max(dot(vN,normalize(vec3(-.4,.8,.5))),0.); vec3 c=pow(vC,vec3(2.2)); o=vec4(c*(.25+.75*df)*vG*1.6+c*.35*vG,1.); }`,
      { uHead: 0, uSig: 0 });
    const beadMesh = new THREE.Mesh(geo, beads); beadMesh.frustumCulled = false; scene.add(beadMesh);
    // the time axis, with a tick per day
    const axisPts = [new THREE.Vector3(-L / 2 - 1, 0, 0), new THREE.Vector3(L / 2 + 1, 0, 0)];
    const lineMat = (c, a = 1) => material(`precision highp float; in vec3 position; uniform mat4 projectionMatrix,modelViewMatrix; void main(){ gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      `precision highp float; out vec4 o; uniform vec3 uC; uniform float uA; void main(){ o=vec4(uC*uA,1.); }`, { uC: new THREE.Vector3(...c), uA: a }, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(axisPts), lineMat([0.35, 0.45, 0.42], 0.6)));
    const days = []; for (let d = new Date(Date.UTC(2026, 10, 23)); d.getTime() <= t1; d = new Date(d.getTime() + 864e5)) days.push(d);
    // the keys: one ring per agent, below the axis
    const keyPos = agents.map((a, i) => new THREE.Vector3((i - (agents.length - 1) / 2) * (V ? 8 : 13), V ? -11 : -8, 2));
    agents.forEach((a, i) => {
      const g = new THREE.Group(), col = colourOf(a), m = lineMat([col.r, col.g, col.b], 1.4);
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 48 }, (_, k) => new THREE.Vector3(Math.cos(k / 48 * Math.PI * 2) * 1.1, Math.sin(k / 48 * Math.PI * 2) * 1.1, 0))), m);
      const shaft = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(1.1, 0, 0), new THREE.Vector3(3.6, 0, 0), new THREE.Vector3(3.6, -0.7, 0), new THREE.Vector3(3.6, 0, 0), new THREE.Vector3(2.9, 0, 0), new THREE.Vector3(2.9, -0.55, 0)]), m);
      g.add(ring, shaft); g.position.copy(keyPos[i]).add(new THREE.Vector3(-1.2, 0, 0)); g.userData.m = m; scene.add(g); keyPos[i].g = g;
    });
    // threads: from each signed commit down to its agent's key (a gentle curve), drawn progressively
    const thrPts = [], thrT = [];
    C.forEach((c, i) => { if (!c.signed || !c.agent) return; const a = pos[i], b = keyPos[agents.indexOf(c.agent)];
      for (let k = 0; k < 24; k++) { const u0 = k / 24, u1 = (k + 1) / 24; for (const u of [u0, u1]) {
        const p = new THREE.Vector3().lerpVectors(a, b, u); p.y += Math.sin(Math.PI * u) * 1.5; p.z += Math.sin(Math.PI * u) * 1.2; thrPts.push(p.x, p.y, p.z);
        const col = colourOf(c.agent); thrT.push(i / C.length, u, col.r, col.g, col.b); } } });
    const tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(thrPts), 3));
    const meta = new Float32Array(thrT); tg.setAttribute("aM", new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(meta, 5), 2, 0)); tg.setAttribute("aC", new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(meta, 5), 3, 2));
    const threads = new THREE.LineSegments(tg, material(
      `precision highp float; in vec3 position; in vec2 aM; in vec3 aC; uniform mat4 projectionMatrix,modelViewMatrix; uniform float uP; out float vA; out vec3 vC;
       void main(){ float start=aM.x*.55; vA=smoothstep(start+aM.y*.4,start+aM.y*.4+.05,uP); vC=pow(aC,vec3(2.2)); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      `precision highp float; in float vA; in vec3 vC; out vec4 o; void main(){ o=vec4(vC*vA*.55,1.); }`, { uP: 0 }, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    threads.frustumCulled = false; scene.add(threads);

    const layer = ctx.overlay();
    const n = C.length, dayFmt = (d) => d.getUTCDate() + " Nov";
    const h1 = layer.add(ctx.text("Every change is kept.", { x: M, y: V ? 200 : 110, size: V ? 96 : 112, font: "display" }));
    const s1 = layer.add(ctx.text(`${n} commits on dev, ${dayFmt(new Date(t0))} to ${dayFmt(new Date(t1))} 2026.`, { x: M + 4, y: V ? 330 : 255, size: V ? 40 : 38, font: "text", color: "#c9d3ce" }));
    const h2 = layer.add(ctx.text(V ? "Every change\nis signed." : "Every change is signed.", { x: M, y: V ? 200 : 110, size: V ? 96 : 112, font: "display", leading: 1.05 }));
    const s2 = layer.add(ctx.text(V ? `${DATA.signed} of ${n} name the agent that made them,\nand each carries that agent's signature.` : `${DATA.signed} of ${n} name the agent that made them, and each carries that agent's signature.`, { x: M + 4, y: V ? 440 : 255, size: V ? 36 : 36, font: "text", color: "#c9d3ce", leading: 1.35 }));
    const dayL = days.map((d) => layer.add(ctx.text(dayFmt(d), { x: 0, y: 0, size: V ? 26 : 24, font: "mono", color: "#8a949e", align: "center" })));
    const keyL = agents.map((a) => layer.add(ctx.text(`${short(a)}\n${DATA.agents[a]} commits`, { x: 0, y: 0, size: V ? 28 : 26, font: "mono", color: "#e6ece9", leading: 1.3, align: "center" })));
    const v3 = new THREE.Vector3(), place = (t, p, dy = 0) => { v3.copy(p).project(cam); t.x = view.x0 + (v3.x * 0.5 + 0.5) * view.w; t.y = view.y0 + (0.5 - v3.y * 0.5) * view.h + dy; };
    let lastBorn = -1;
    return {
      resize() { cam.aspect = gfx.aspect; cam.updateProjectionMatrix(); },
      update(s) {
        const head = s.k(0, 0.4, 4.6, ease.lin) * 1.04, sig = s.k(1, 0, 4.2, ease.lin), up = s.k(1, 0, 3, ease.io3);
        beads.uniforms.uHead.value = head; beads.uniforms.uSig.value = s.k(1, 0.2, 1.2, ease.lin); threads.material.uniforms.uP.value = sig;
        // a tick for each commit as the playhead passes it (logged with the deck clock, so the film's sound matches)
        const born = C.findLastIndex((c, i) => (Date.parse(c.t) - t0) / (t1 - t0) <= head - 0.01);
        if (born > lastBorn && s.beat === 0 && s.dir > 0) { for (let i = lastBorn + 1; i <= born; i++) ctx.sound("tick", { g: 0.12 + 0.03 * Math.sqrt(C[i].files), rate: 1.6 + 0.3 * (i % 5) / 5, pan: (pos[i].x / L) * 1.2 }); }
        lastBorn = Math.max(lastBorn, born); if (s.beat === 0 && head < 0.02) lastBorn = -1;
        const cx = lerp(-L * 0.5 + head * L * 0.9, 0, clamp(s.k(0, 3.6, 5.4, ease.io3) + up)), dist = lerp(V ? 26 : 22, V ? 62 : 48, clamp(s.k(0, 3.6, 5.4, ease.io3) * 0.7 + up * 0.5));
        cam.aspect = gfx.aspect; cam.position.set(cx + s.mouse.x * 2, lerp(4, V ? 2 : 1, up) + s.mouse.y * 1.5, dist); cam.lookAt(cx, lerp(2, V ? -4 : -2.5, up), 0); cam.updateProjectionMatrix();
        keyPos.forEach((k) => { k.g.userData.m.uniforms.uA.value = 1.4 * s.k(1, 0.3, 1.5, ease.lin); });
        h1.show(s.k(0, 0.6, 2.4, ease.lin), { stagger: 0.35, q: s.k(1, 0, 0.8, ease.lin) }); s1.show(s.k(0, 1.6, 2.8, ease.lin), { style: "fade", q: s.k(1, 0, 0.8, ease.lin) });
        h2.show(s.k(1, 0.9, 2.6, ease.lin), { stagger: 0.35 }); s2.show(s.k(1, 2.0, 3.2, ease.lin), { style: "fade" });
        days.forEach((d, i) => { place(dayL[i], new THREE.Vector3(((d.getTime() - t0) / (t1 - t0) - 0.5) * L, -0.9, 0)); dayL[i].show(clamp(s.k(0, 4.2, 5.2, ease.lin) + up) * clamp((head - (d.getTime() - t0) / (t1 - t0)) * 20), { style: "fade" }); });
        agents.forEach((a, i) => { place(keyL[i], keyPos[i], V ? 40 : 46); keyL[i].show(s.k(1, 1.0 + i * 0.2, 2.0 + i * 0.2, ease.lin), { style: "fade" }); });
      },
      render(out, s) {
        gfx.draw(scene, cam, ms, { color: 0x04050a });
        gfx.post(ms, out, { bloom: 0.5, threshold: 0.9, exposure: 1.05, contrast: 1.04, vignette: 0.28, grain: 0.02, time: s.t });
        layer.render(out);
      },
    };
  },
};
