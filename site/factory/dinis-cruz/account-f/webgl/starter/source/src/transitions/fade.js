export default {
  dur: 0.7,
  create({ gfx }) {
    const pass = gfx.pass("uniform sampler2D tA,tB; uniform float p; void main(){ o=mix(texture(tA,vUv),texture(tB,vUv),smoothstep(0.,1.,p)); }", { tA: null, tB: null, p: 0 });
    return {
      render({ A, B, p, out }) {
        if (p <= 0) return gfx.copy(A, out);
        if (p >= 1) return gfx.copy(B, out);
        pass.u.tA.value = A.texture; pass.u.tB.value = B.texture; pass.u.p.value = p; pass.render(out);
      },
    };
  },
};
