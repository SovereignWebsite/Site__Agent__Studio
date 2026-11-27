// Scene 4: a field of drifting points that gathers and travels; the closing line.
import * as THREE from "three";
import { material } from "../gfx.js";
import { ease, lerp, rng } from "../util.js";

export default {
  id: "move",
  title: "Move it anywhere",
  enterWith: "iris",
  beats: [{ dur: 4, hold: 3 }, { dur: 3, hold: 5 }],
  notes: ["It can move anywhere, at any time: it is plain HTML.", "sovereignwebsite.org: the open pattern."],
  create(ctx) {
    const { gfx } = ctx;
    const ms = gfx.target({ samples: 4, depth: false });
    const scene = new THREE.Scene();
    const V = ctx.view.portrait;
    const cam = new THREE.PerspectiveCamera(V ? 62 : 40, 1, 0.1, 200);
    const N = 36000, R = rng(11), a = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) a.set([R() * 2 - 1, R() * 2 - 1, R() * 2 - 1, R()], i * 4);
    const geo = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    geo.index = quad.index; geo.setAttribute("position", quad.getAttribute("position"));
    geo.setAttribute("iA", new THREE.InstancedBufferAttribute(a, 4)); geo.instanceCount = N;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const mat = material(
      `precision highp float; in vec3 position; in vec4 iA; uniform mat4 projectionMatrix,viewMatrix; uniform float uTime,uG,uM,uP;
       out vec2 vQ; out float vH;
       void main(){
         float r=pow(abs(iA.x)*.5+.5,1.6)*26.+2., th=iA.y*3.14159+uTime*.06*(1.+iA.w), ph=iA.z*.9;
         vec3 cloud=vec3(cos(th)*r+6.*(1.-uP), sin(ph)*r*.35-4.*uP, sin(th)*r-12.);
         float k=iA.w*6.2832; vec3 ring=vec3(cos(k)*6.*(1.-.55*uM)+9.*(1.-uP), sin(k)*6.*(1.-.55*uM)-1.5-2.2*uP, -12.)+vec3(iA.xyz)*vec3(.22,.22,.6)*pow(abs(iA.x),2.);     // a gathered ring
         vec3 p=mix(cloud,ring,uG); p.x+=uM*5.*(1.-uP);                         // then it travels
         vec4 v=viewMatrix*vec4(p,1.); v.xy+=position.xy*(.045+.06*iA.w);
         vQ=position.xy; vH=iA.w; gl_Position=projectionMatrix*v; }`,
      `precision highp float; in vec2 vQ; in float vH; out vec4 o;
       void main(){ float d=length(vQ)*2.; float a=exp(-d*d*6.)+.6*exp(-d*d*60.); if(a<.01) discard;
         vec3 c=mix(vec3(.4,1.,.65),vec3(1.,.82,.5),step(.93,vH))*(1.2+2.*step(.985,vH)); o=vec4(c*a,a); }`,
      { uTime: 0, uG: 0, uM: 0, uP: V ? 1 : 0 },
      { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending },
    );
    const pts = new THREE.Mesh(geo, mat); pts.frustumCulled = false; scene.add(pts);
    const layer = ctx.overlay();
    const line = layer.add(ctx.text(V ? "Move it\nanywhere,\nat any time." : "Move it anywhere,\nat any time.", { x: V ? 72 : 140, y: V ? 200 : 140, size: 112, font: "display", leading: 1.08 }));
    const url = layer.add(ctx.text("sovereignwebsite.org", { x: V ? 76 : 144, y: V ? 590 : 430, size: V ? 38 : 30, font: "mono", color: "#8fe0b4" }));
    return {
      resize() { cam.aspect = gfx.aspect; cam.updateProjectionMatrix(); },
      update(s) {
        mat.uniforms.uTime.value = s.t;
        mat.uniforms.uG.value = s.k(0, 0.5, 3.8, ease.io3);
        mat.uniforms.uM.value = s.k(1, 0.3, 3, ease.in3);
        cam.aspect = gfx.aspect; cam.position.set(s.mouse.x * 2, 1.5 + s.mouse.y, lerp(22, 16, s.k(0, 0, 4))); cam.lookAt(0, 0, -12); cam.updateProjectionMatrix();
        line.show(s.k(0, 1.2, 3.2, ease.lin), { stagger: 0.45 });
        url.show(s.k(1, 0.6, 1.8, ease.lin), { style: "fade" });
      },
      render(out, s) {
        gfx.draw(scene, cam, ms, { color: 0x020405 });
        gfx.post(ms, out, { bloom: 0.6, threshold: 0.9, exposure: 1, vignette: 0.25, grain: 0.02, time: s.t });
        layer.render(out);
      },
    };
  },
};
