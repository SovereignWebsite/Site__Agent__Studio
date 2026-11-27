// Scene 1: "This website is a folder." Every file in this site's site/ folder is one box (from data.json): they fly in
// and pack into one block, then sort themselves into stacks by kind, each labelled with its real count.
import * as THREE from "three";
import { material } from "../gfx.js";
import { ease, lerp, rng, clamp } from "../util.js";
import DATA from "../data.json";

const KINDS = [["picture", "pictures", "#9fb3d1"], ["code", "code", "#8fe0b4"], ["data", "data", "#c7b8ff"],
  ["sound", "sounds", "#ffb38a"], ["page", "pages", "#ffffff"], ["font", "fonts", "#ffd27a"], ["style", "styles", "#7fc3ff"], ["other", "other", "#b8c0c8"]]
  .filter(([k]) => DATA.byKind[k]);

export default {
  id: "folder",
  title: "A folder",
  enterWith: "iris",
  beats: [{ dur: 5, hold: 2.5 }, { dur: 4.5, hold: 4.5 }],
  notes: ["This website is a folder: every box is one real file in it.", `${DATA.files} files, served as they are. No server runs code for this site.`],
  create(ctx) {
    const { gfx, view } = ctx, V = view.portrait, M = V ? 72 : 140;
    const ms = gfx.target({ samples: 4, depth: true }), scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(V ? 52 : 32, 1, 0.1, 400);
    // one instance per file, grouped by kind
    const list = []; KINDS.forEach(([k], ki) => { for (let i = 0; i < DATA.byKind[k]; i++) list.push(ki); });
    const N = list.length, R = rng(3), box = new THREE.BoxGeometry(0.86, 0.86, 0.86);
    const geo = new THREE.InstancedBufferGeometry(); geo.index = box.index;
    geo.setAttribute("position", box.getAttribute("position")); geo.setAttribute("normal", box.getAttribute("normal"));
    const pA = new Float32Array(N * 3), pB = new Float32Array(N * 3), pC = new Float32Array(N * 3), col = new Float32Array(N * 3), rnd = new Float32Array(N);
    const S = Math.ceil(Math.cbrt(N)), counts = KINDS.map(() => 0);
    // each kind gets a stack whose footprint suits its count (about five layers high), laid side by side
    const GAP = 3.4, widths = KINDS.map(([k]) => Math.max(2, Math.ceil(Math.sqrt(DATA.byKind[k] / 5))));
    const totalW = widths.reduce((a, w) => a + w, 0) + GAP * (KINDS.length - 1);
    const left = widths.map((w, i) => -totalW / 2 + widths.slice(0, i).reduce((a, x) => a + x, 0) + GAP * i), centres = widths.map((w, i) => left[i] + w / 2);
    list.forEach((ki, i) => {
      const r = R(), th = R() * Math.PI * 2, ph = Math.acos(R() * 2 - 1), d = 40 + 30 * R();
      pA.set([Math.sin(ph) * Math.cos(th) * d, Math.cos(ph) * d * 0.6, Math.sin(ph) * Math.sin(th) * d], i * 3);       // scattered
      pB.set([(i % S) - S / 2 + 0.5, Math.floor(i / (S * S)) - S / 2 + 0.5, (Math.floor(i / S) % S) - S / 2 + 0.5], i * 3);  // packed block
      const w = widths[ki], n = counts[ki]++, c = n % (w * w), h = Math.floor(n / (w * w));
      pC.set([left[ki] + (c % w) + 0.5, h + 0.5 - 4, Math.floor(c / w) - w / 2 + 0.5], i * 3);   // stacks by kind
      col.set(new THREE.Color(KINDS[ki][2]).toArray(), i * 3); rnd[i] = r;
    });
    for (const [n, a] of [["pA", pA], ["pB", pB], ["pC", pC], ["iCol", col]]) geo.setAttribute(n, new THREE.InstancedBufferAttribute(a, 3));
    geo.setAttribute("iR", new THREE.InstancedBufferAttribute(rnd, 1)); geo.instanceCount = N;
    const mat = material(
      `precision highp float; in vec3 position,normal,pA,pB,pC,iCol; in float iR; uniform mat4 projectionMatrix,viewMatrix; uniform float uIn,uSort,uTime;
       out vec3 vN,vC,vW; out float vR;
       void main(){
         float k=clamp((uIn*1.35-iR*.35),0.,1.); k=k*k*(3.-2.*k);                       // each file arrives at its own moment
         float s=clamp((uSort*1.3-iR*.3),0.,1.); s=s*s*(3.-2.*s);
         vec3 p=mix(mix(pA,pB,k),pC,s);
         p.y+=sin(uTime*1.3+iR*40.)*.04*(1.-k);
         float a=(1.-k)*iR*6.;                                                           // tumbling on the way in
         vec3 q=position; q.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*q.xz; q.xy=mat2(cos(a*.7),-sin(a*.7),sin(a*.7),cos(a*.7))*q.xy;
         vW=p+q; vN=normal; vC=iCol; vR=iR;
         gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }`,
      `precision highp float; in vec3 vN,vC,vW; in float vR; out vec4 o; uniform vec3 uCam;
       void main(){ vec3 L=normalize(vec3(-.5,.9,.4)); float df=max(dot(vN,L),0.);
         vec3 alb=pow(vC,vec3(2.2));
         vec3 c=alb*(.10+.9*df)+alb*step(.5,vN.y)*.9*(.6+.4*vR);                         // lit tops glow a little
         float f=1.-exp(-length(vW-uCam)*.012); c=mix(c,vec3(.01,.012,.02),f*.6); o=vec4(c,1.); }`,
      { uIn: 0, uSort: 0, uTime: 0, uCam: new THREE.Vector3() });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; scene.add(mesh);

    const layer = ctx.overlay();
    const t1 = layer.add(ctx.text(V ? "This website\nis a folder." : "This website is a folder.", { x: M, y: V ? 200 : 110, size: V ? 100 : 112, font: "display", leading: 1.05 }));
    const t2 = layer.add(ctx.text(V ? `${DATA.files} files,\nserved as\nthey are.` : `${DATA.files} files, served as they are.`, { x: M, y: V ? 200 : 110, size: V ? 100 : 112, font: "display", leading: 1.05 }));
    const sub = layer.add(ctx.text(V ? "No server runs code for this site:\nwhat you see is what is in the folder." : "No server runs code for this site: what you see is what is in the folder.", { x: M + 4, y: V ? 560 : 255, size: V ? 40 : 38, font: "text", color: "#c9d3ce", leading: 1.35 }));
    const labels = KINDS.map(([k, name]) => layer.add(ctx.text(`${DATA.byKind[k]}\n${DATA.byKind[k] === 1 ? name.replace(/s$/, "") : name}`, { x: 0, y: 0, size: V ? 30 : 26, font: "mono", color: "#c9d3ce", leading: 1.3, align: "center" })));
    const v3 = new THREE.Vector3();
    return {
      resize() { cam.aspect = gfx.aspect; cam.updateProjectionMatrix(); },
      update(s) {
        const inP = s.k(0, 0.2, 4.4, ease.lin), sort = s.k(1, 0.2, 3.6, ease.lin);
        mat.uniforms.uIn.value = inP; mat.uniforms.uSort.value = sort; mat.uniforms.uTime.value = s.t;
        const orbit = s.t * 0.05 - 0.35 + s.mouse.x * 0.25, dist = lerp(V ? 46 : 36, V ? 108 : 66, ease.io3(sort));
        cam.aspect = gfx.aspect; cam.position.set(Math.sin(orbit) * dist, lerp(14, 12, sort) + s.mouse.y * 2, Math.cos(orbit) * dist);
        cam.lookAt(0, lerp(V ? 1.5 : 1.4, V ? 2 : 1.5, ease.io3(sort)), 0); cam.updateProjectionMatrix(); mat.uniforms.uCam.value.copy(cam.position);
        t1.show(s.k(0, 0.6, 2.4, ease.lin), { stagger: 0.35, q: s.k(1, 0, 0.8, ease.lin) });
        t2.show(s.k(1, 0.8, 2.6, ease.lin), { stagger: 0.35 });
        sub.show(s.k(1, 2.2, 3.4, ease.lin), { style: "fade" });
        // a label under each stack, projected from 3D
        labels.forEach((l, i) => {
          v3.set(centres[i], -5.2, widths[i] / 2 + 1).project(cam);
          l.x = view.x0 + (v3.x * 0.5 + 0.5) * view.w; l.y = view.y0 + (0.5 - v3.y * 0.5) * view.h + (V ? (i % 2) * 84 : 0);   // alternate heights so neighbours never touch
          l.show(clamp(s.k(1, 2.4 + i * 0.12, 3.4 + i * 0.12, ease.lin)), { style: "fade" });
        });
      },
      render(out, s) {
        gfx.draw(scene, cam, ms, { color: 0x05060c });
        gfx.post(ms, out, { bloom: 0.35, threshold: 0.95, exposure: 1.05, contrast: 1.05, vignette: 0.25, grain: 0.02, time: s.t });
        layer.render(out);
      },
    };
  },
};
