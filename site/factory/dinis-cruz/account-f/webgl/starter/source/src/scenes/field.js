// Scene template #2: an instanced 3D scene (8,100 boxes, one draw call), animated in the vertex shader,
// rendered into a 4x MSAA HDR target, then post-processed, then text on top.
import * as THREE from "three";
import { material } from "../gfx.js";
import { NOISE } from "../glsl.js";
import { ease, lerp, rng } from "../util.js";

export default {
  id: "field",
  title: "The field",
  enterWith: "daybreak",
  beats: [
    { dur: 4, hold: 4 },
    { dur: 5, hold: 5 },
  ],
  notes: ["Eight thousand objects, one draw call.", "Click: the wave grows and the camera dives in."],
  create(ctx) {
    const { gfx } = ctx;
    const ms = gfx.target({ samples: 4, depth: true });
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 400);

    const NX = 90, NZ = 90, N = NX * NZ, R = rng(7);
    const box = new THREE.BoxGeometry(0.82, 1, 0.82); box.translate(0, 0.5, 0);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = box.index; geo.setAttribute("position", box.getAttribute("position")); geo.setAttribute("normal", box.getAttribute("normal"));
    const iP = new Float32Array(N * 4);
    for (let z = 0, i = 0; z < NZ; z++) for (let x = 0; x < NX; x++, i++) iP.set([x - NX / 2, 0, -z * 1.0, R()], i * 4);
    geo.setAttribute("iP", new THREE.InstancedBufferAttribute(iP, 4));
    geo.instanceCount = N;

    const mat = material(
      `precision highp float; in vec3 position,normal; in vec4 iP; uniform mat4 projectionMatrix,viewMatrix; uniform float uTime,uAmp;
       out vec3 vW,vN; out float vH,vR; ${NOISE}
       void main(){ float d=length(iP.xz-vec2(0.,-18.)); float w=sin(d*.35-uTime*1.6)*.5+.5; float n=fbm(iP.xz*.06+uTime*.05);
         float h=.15+uAmp*(w*w*3.+n*2.)+iP.w*.2; vec3 p=position; p.y*=h; vW=p+vec3(iP.x,0.,iP.z); vN=normal; vH=w; vR=iP.w;
         gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }`,
      `precision highp float; in vec3 vW,vN; in float vH,vR; out vec4 o; uniform vec3 uCam;
       void main(){ vec3 L=normalize(vec3(-.4,.8,.3)); float df=max(dot(vN,L),0.); vec3 alb=mix(vec3(.08,.09,.11),vec3(.9,.92,.95),step(.97,vR));
         vec3 c=alb*(df*vec3(1.,.9,.8)*1.2+vec3(.10,.13,.2));
         c+=vec3(1.,.5,.2)*step(.5,vN.y)*pow(vH,8.)*4.;                  // hot tops = bloom
         float f=1.-exp(-length(vW-uCam)*.045); c=mix(c,vec3(.02,.025,.05),f); o=vec4(c,1.); }`,
      { uTime: 0, uAmp: 0.3, uCam: new THREE.Vector3() },
    );
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; scene.add(mesh);

    const layer = ctx.overlay();
    const head = layer.add(ctx.text("8,100 instances.\nOne draw call.", { x: 140, y: 150, size: 96, font: "display" }));
    const tag = layer.add(ctx.text("animated entirely in the vertex shader", { x: 144, y: 400, size: 34, font: "mono", color: "#ffb38a" }));
    return {
      resize() { cam.aspect = gfx.aspect; cam.updateProjectionMatrix(); },
      update(s) {
        const dive = s.k(1, 0, 4.5, ease.io3);
        mat.uniforms.uTime.value = s.t;
        mat.uniforms.uAmp.value = lerp(0.35, 1.1, s.k(1, 0, 3));
        cam.aspect = gfx.aspect;
        cam.position.set(Math.sin(s.t * 0.08) * 6 + s.mouse.x * 2, lerp(9, 6.5, dive) + s.mouse.y, lerp(16, 10, dive));
        cam.lookAt(0, lerp(-1.5, 0.5, dive), lerp(-30, -26, dive));
        cam.updateProjectionMatrix(); mat.uniforms.uCam.value.copy(cam.position);
        const out = s.k(1, 0.2, 1.4, ease.lin);
        head.show(s.k(0, 0.8, 2.6, ease.lin), { stagger: 0.35, q: out });
        tag.show(s.k(0, 1.8, 3.2, ease.lin), { style: "fade", q: out });
      },
      render(out, s) {
        gfx.draw(scene, cam, ms, { color: 0x05060c });
        gfx.post(ms, out, { bloom: 0.45, threshold: 1, exposure: 1, contrast: 1.05, vignette: 0.22, grain: 0.02, time: s.t });
        layer.render(out);
      },
    };
  },
};
