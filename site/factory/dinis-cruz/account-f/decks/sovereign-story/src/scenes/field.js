// Scene template #2: an instanced 3D scene (8,100 boxes, one draw call), animated in the vertex shader,
// rendered into a 4x MSAA HDR target, then post-processed, then text on top.
import * as THREE from "three";
import { material } from "../gfx.js";
import { NOISE } from "../glsl.js";
import { ease, lerp, rng } from "../util.js";

export default {
  id: "field",
  title: "Static files",
  enterWith: "daybreak",
  beats: [
    { dur: 4, hold: 4 },
    { dur: 5, hold: 5 },
  ],
  notes: ["Every page is a static file: 8,100 boxes here, drawn in one go.", "No server code, no cookies, no tracking."],
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
      `precision highp float; in vec3 vW,vN; in float vH,vR; out vec4 o; uniform vec3 uCam; uniform float uHue;
       void main(){ vec3 L=normalize(vec3(-.4,.8,.3)); float df=max(dot(vN,L),0.); vec3 alb=mix(vec3(.08,.09,.11),vec3(.9,.92,.95),step(.97,vR));
         vec3 c=alb*(df*vec3(1.,.9,.8)*1.2+vec3(.10,.13,.2));
         c+=mix(vec3(1.,.5,.2),vec3(.3,1.,.6),uHue)*step(.5,vN.y)*pow(vH,8.)*4.;                  // hot tops = bloom
         float f=1.-exp(-length(vW-uCam)*.045); c=mix(c,vec3(.02,.025,.05),f); o=vec4(c,1.); }`,
      { uTime: 0, uAmp: 0.3, uCam: new THREE.Vector3(), uHue: 0 },
    );
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; scene.add(mesh);

    const scrim = gfx.pass("void main(){ float a=.62*smoothstep(.45,1.,vUv.y)*(1.-smoothstep(.15,.75,vUv.x)); o=vec4(0.,0.,0.,a); }", {},
      { transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
    const layer = ctx.overlay();
    const head = layer.add(ctx.text("Static files.", { x: 140, y: 150, size: 110, font: "display" }));
    const tag = layer.add(ctx.text("plain HTML in site/, served from the dev branch", { x: 144, y: 300, size: 34, font: "mono", color: "#ffb38a" }));
    const rows = ["server code.", "cookies.", "tracking."].map((w, i) => ({
      no: layer.add(ctx.text("No", { x: 140, y: 140 + i * 112, size: 100, font: "display", color: "#8fe0b4" })),
      rest: layer.add(ctx.text(w, { x: 140, y: 140 + i * 112, size: 100, font: "display", color: "#f4f7f5" })),
    }));
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
        rows.forEach((r, i) => {
          const t0 = 1.0 + i * 0.75; r.rest.x = 140 + r.no.width() + 28;
          r.no.show(s.k(1, t0, t0 + 0.6, ease.lin), { stagger: 0 }); r.rest.show(s.k(1, t0 + 0.15, t0 + 0.9, ease.lin), { stagger: 0.3 });
        });
        mat.uniforms.uHue.value = s.k(1, 0.8, 3.4, ease.io3);
      },
      render(out, s) {
        gfx.draw(scene, cam, ms, { color: 0x05060c });
        gfx.post(ms, out, { bloom: 0.45, threshold: 1, exposure: 1, contrast: 1.05, vignette: 0.22, grain: 0.02, time: s.t });
        scrim.render(out);
        layer.render(out);
      },
    };
  },
};
