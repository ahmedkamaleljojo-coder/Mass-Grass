/* Mass & Grass — wet paper.
   A small stable-fluids simulation (WebGL2): the pointer pushes water and drops pigment; the
   pigment is stored as absorbance and shown with Beer–Lambert (colour = e^-absorbance), so two
   washes darken where they overlap, the way watercolour glazes do. Edges of each wash get a
   slightly darker rim (the dried "tide line"), and the paper keeps a faint grain. Pigment slowly
   fades, as a wash dries back into the paper. Without WebGL2 the section shows a still painting. */
(function () {
  'use strict';
  const canvas = document.getElementById('fluid');
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: false });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) { document.getElementById('wet').classList.add('still'); return; }
  gl.getExtension('OES_texture_float_linear');

  // a watercolour box: ultramarine, sap green, burnt sienna, quinacridone rose, yellow ochre, indigo
  const PIGMENTS = [
    ['ultramarine', [0.24, 0.36, 0.72]], ['sap green', [0.42, 0.58, 0.28]], ['burnt sienna', [0.66, 0.34, 0.2]],
    ['quinacridone rose', [0.84, 0.36, 0.46]], ['yellow ochre', [0.86, 0.66, 0.26]], ['indigo', [0.2, 0.25, 0.4]]
  ];
  const absorb = c => c.map(v => -Math.log(Math.max(v, .02)));

  const VS = `#version 300 es
  in vec2 aPos; out vec2 vUv, vL, vR, vT, vB; uniform vec2 texel;
  void main(){ vUv=aPos*.5+.5; vL=vUv-vec2(texel.x,0.); vR=vUv+vec2(texel.x,0.); vT=vUv+vec2(0.,texel.y); vB=vUv-vec2(0.,texel.y); gl_Position=vec4(aPos,0.,1.); }`;
  const FS = {
    splat: `#version 300 es
    precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uT; uniform float aspect, radius; uniform vec3 color; uniform vec2 point;
    void main(){ vec2 p=vUv-point; p.x*=aspect; float s=exp(-dot(p,p)/radius); o=vec4(texture(uT,vUv).rgb+s*color,1.); }`,
    advect: `#version 300 es
    precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uVel, uSrc; uniform vec2 texel; uniform float dt, diss;
    void main(){ vec2 c=vUv-dt*texture(uVel,vUv).xy*texel; o=texture(uSrc,c)/(1.+diss*dt); }`,
    curl: `#version 300 es
    precision highp float; in vec2 vL,vR,vT,vB; out vec4 o; uniform sampler2D uVel;
    void main(){ float c=texture(uVel,vR).y-texture(uVel,vL).y-texture(uVel,vT).x+texture(uVel,vB).x; o=vec4(.5*c,0.,0.,1.); }`,
    vort: `#version 300 es
    precision highp float; in vec2 vUv,vL,vR,vT,vB; out vec4 o; uniform sampler2D uVel,uCurl; uniform float strength, dt;
    void main(){ float L=texture(uCurl,vL).x,R=texture(uCurl,vR).x,T=texture(uCurl,vT).x,B=texture(uCurl,vB).x,C=texture(uCurl,vUv).x;
      vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L)); f/=length(f)+1e-4; f*=strength*C; f.y*=-1.;
      vec2 v=texture(uVel,vUv).xy+f*dt; o=vec4(clamp(v,-1000.,1000.),0.,1.); }`,
    div: `#version 300 es
    precision highp float; in vec2 vUv,vL,vR,vT,vB; out vec4 o; uniform sampler2D uVel;
    void main(){ float L=texture(uVel,vL).x,R=texture(uVel,vR).x,T=texture(uVel,vT).y,B=texture(uVel,vB).y; vec2 C=texture(uVel,vUv).xy;
      if(vL.x<0.)L=-C.x; if(vR.x>1.)R=-C.x; if(vT.y>1.)T=-C.y; if(vB.y<0.)B=-C.y; o=vec4(.5*(R-L+T-B),0.,0.,1.); }`,
    press: `#version 300 es
    precision highp float; in vec2 vL,vR,vT,vB; out vec4 o; uniform sampler2D uP,uDiv; in vec2 vUv;
    void main(){ float L=texture(uP,vL).x,R=texture(uP,vR).x,T=texture(uP,vT).x,B=texture(uP,vB).x,d=texture(uDiv,vUv).x; o=vec4((L+R+B+T-d)*.25,0.,0.,1.); }`,
    grad: `#version 300 es
    precision highp float; in vec2 vUv,vL,vR,vT,vB; out vec4 o; uniform sampler2D uP,uVel;
    void main(){ float L=texture(uP,vL).x,R=texture(uP,vR).x,T=texture(uP,vT).x,B=texture(uP,vB).x; vec2 v=texture(uVel,vUv).xy-vec2(R-L,T-B); o=vec4(v,0.,1.); }`,
    scale: `#version 300 es
    precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uT; uniform float k; void main(){ o=texture(uT,vUv)*k; }`,
    show: `#version 300 es
    precision highp float; in vec2 vUv,vL,vR,vT,vB; out vec4 o; uniform sampler2D uDye; uniform vec3 paper; uniform vec2 res;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    void main(){
      vec3 a=texture(uDye,vUv).rgb;
      float m=dot(a,vec3(.333));
      float g=length(vec2(dot(texture(uDye,vR).rgb-texture(uDye,vL).rgb,vec3(.333)),dot(texture(uDye,vT).rgb-texture(uDye,vB).rgb,vec3(.333))));
      vec2 px=vUv*res;
      float grain=n(px*.9)*.6+n(px*.23)*.4;                    // cold-press paper: pigment settles in the dips
      a*=.86+.28*grain;
      a+=a*smoothstep(.0,.08,g)*.55;                            // the darker rim where a wash dries
      vec3 c=paper*exp(-a);
      c*=.985+.015*n(px*1.7);
      o=vec4(c,1.); }`
  };

  function compile(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  const vs = compile(gl.VERTEX_SHADER, VS);
  const P = {};
  for (const k in FS) {
    const p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, FS[k]));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
    P[k] = { p, u };
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  function fbo(w, h) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    return { t, f, w, h };
  }
  const dbl = (w, h) => { let a = fbo(w, h), b = fbo(w, h); return { get r() { return a; }, get w() { return b; }, swap() { [a, b] = [b, a]; }, width: w, height: h }; };
  let vel, dye, pres, div, curl, simW, simH;
  function init() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr);
    const ar = canvas.width / canvas.height, s = 144, d = 640;
    simW = ar > 1 ? Math.round(s * ar) : s; simH = ar > 1 ? s : Math.round(s / ar);
    const dw = ar > 1 ? Math.round(d * ar) : d, dh = ar > 1 ? d : Math.round(d / ar);
    vel = dbl(simW, simH); pres = dbl(simW, simH); div = fbo(simW, simH); curl = fbo(simW, simH); dye = dbl(dw, dh);
  }
  function run(prog, target, uniforms) {
    gl.useProgram(prog.p);
    let unit = 0;
    for (const k in uniforms) {
      const v = uniforms[k], loc = prog.u[k]; if (loc == null) continue;
      if (v && v.t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v.t); gl.uniform1i(loc, unit++); }
      else if (Array.isArray(v)) (v.length === 2 ? gl.uniform2fv : gl.uniform3fv).call(gl, loc, v);
      else gl.uniform1f(loc, v);
    }
    if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.f); gl.viewport(0, 0, target.w, target.h); }
    else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // pigment and water dropped at a point (uv 0–1), with a push
  let pig = 0;
  const pigLabel = document.getElementById('pig');
  function setPigment(i) { pig = i % PIGMENTS.length; if (pigLabel) pigLabel.textContent = PIGMENTS[pig][0]; }
  function splat(x, y, dx, dy, amount, rad) {
    const ar = canvas.width / canvas.height;
    run(P.splat, vel.w, { uT: vel.r, aspect: ar, point: [x, y], color: [dx, dy, 0], radius: (rad || .0016) * .8, texel: [1 / simW, 1 / simH] }); vel.swap();
    const c = absorb(PIGMENTS[pig][1]).map(v => v * (amount || .14));
    run(P.splat, dye.w, { uT: dye.r, aspect: ar, point: [x, y], color: c, radius: rad || .0016, texel: [1 / dye.width, 1 / dye.height] }); dye.swap();
  }
  function step(dt) {
    const tx = [1 / simW, 1 / simH];
    run(P.curl, curl, { uVel: vel.r, texel: tx });
    run(P.vort, vel.w, { uVel: vel.r, uCurl: curl, strength: 7, dt, texel: tx }); vel.swap();
    run(P.div, div, { uVel: vel.r, texel: tx });
    run(P.scale, pres.w, { uT: pres.r, k: .8, texel: tx }); pres.swap();
    for (let i = 0; i < 22; i++) { run(P.press, pres.w, { uP: pres.r, uDiv: div, texel: tx }); pres.swap(); }
    run(P.grad, vel.w, { uP: pres.r, uVel: vel.r, texel: tx }); vel.swap();
    run(P.advect, vel.w, { uVel: vel.r, uSrc: vel.r, dt, diss: .9, texel: tx }); vel.swap();
    run(P.advect, dye.w, { uVel: vel.r, uSrc: dye.r, dt, diss: .09, texel: tx }); dye.swap();
  }
  const PAPER = [0.985, 0.978, 0.962];
  function show() { run(P.show, null, { uDye: dye.r, paper: PAPER, res: [canvas.width, canvas.height], texel: [1 / dye.width, 1 / dye.height] }); }

  // the pointer is a wet brush
  let last = null, visible = true, moved = 0;
  canvas.parentElement.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
    if (last) {
      const dx = (x - last.x) * 5200, dy = (y - last.y) * 5200, sp = Math.hypot(dx, dy);
      if (sp > 1) { splat(x, y, dx, dy, Math.min(.15, .04 + sp * .0002)); moved += sp; }
      if (moved > 2600) { moved = 0; setPigment(pig + 1); }                  // a new colour every few strokes
    }
    last = { x, y };
  }, { passive: true });
  canvas.parentElement.addEventListener('pointerleave', () => { last = null; });
  canvas.parentElement.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    splat((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height, 0, 0, .9, .006);   // a drop of colour
    setPigment(pig + 1);
  });
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(canvas);

  // on opening, a few brush strokes cross the page by themselves
  const intro = [];
  [[.12, .72, .45, .58, 0], [.85, .3, .55, .44, 2], [.3, .2, .62, .26, 4], [.7, .82, .4, .78, 1], [.5, .5, .58, .52, 3]].forEach(([x0, y0, x1, y1, p], i) => {
    for (let k = 0; k <= 26; k++) intro.push({ t: i * 340 + k * 16, x: x0 + (x1 - x0) * k / 26, y: y0 + (y1 - y0) * k / 26 + Math.sin(k / 4) * .02, dx: (x1 - x0) * 260, dy: (y1 - y0) * 260, p });
  });
  let t0 = 0;
  init(); setPigment(0);
  if (reduced) intro.forEach(s => { setPigment(s.p); splat(s.x, s.y, 0, 0, .25); });
  let prev = performance.now();
  function frame(now) {
    if (!t0) t0 = now;
    while (intro.length && intro[0].t <= now - t0) { const s = intro.shift(); setPigment(s.p); splat(s.x, s.y, s.dx, s.dy, .16); }
    const dt = Math.min((now - prev) / 1000, 1 / 30); prev = now;
    if (visible) { if (!reduced) step(dt); show(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  addEventListener('resize', () => { clearTimeout(init._t); init._t = setTimeout(init, 200); });
})();
