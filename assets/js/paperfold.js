/* Mass & Grass — PaperFold: a cut-out drawn as a real sheet of paper that folds.

   The sheet is a mesh (the cut-out's alpha is its outline). Folding happens in
   two creases like folding a letter: first the top half bends over the bottom
   half toward you, then the folded half bends right-over-left. Each crease is
   a small cylinder (paper never folds on a knife edge), the flap turns over to
   show the plain back of the paper, and every fragment is lit from its own
   normal, so the curl catches light and the underside falls into shade.

   const pf = PaperFold(canvas, { margin: [.35, .25] });
   pf.image(url)    // set the picture (cached per canvas)
   pf.fold(0..1)    // 0 = flat, 1 = folded into a quarter
   pf.mirror(bool)  // face the other way
   Returns null when WebGL is not available. */
(function (global) {
  'use strict';

  const VS = `
attribute vec2 aUV;
uniform float uW, uA1, uA2, uR1, uR2, uC1, uTilt, uF, uAsp, uD, uFlip;
varying vec2 vUV; varying vec3 vN; varying vec3 vP;

vec2 bend(float d, float z, float th, float r) {
  if (d <= 0.0) return vec2(d, z);
  float L = th * r;
  vec2 C; vec2 N;
  if (d < L) { float ph = d / r; C = vec2(r * sin(ph), r * (1.0 - cos(ph))); N = vec2(-sin(ph), cos(ph)); }
  else { C = vec2(r * sin(th) + (d - L) * cos(th), r * (1.0 - cos(th)) + (d - L) * sin(th)); N = vec2(-sin(th), cos(th)); }
  return C + z * N;
}
vec3 fold(vec2 uv) {
  vec3 p = vec3((uv.x - 0.5) * uW, 1.0 - uv.y, 0.0);        // feet at y = 0, image top at y = 1
  vec2 b = bend(p.y - uC1, p.z, uA1, uR1); p.y = uC1 + b.x; p.z = b.y;   // top half over the bottom
  b = bend(p.x, p.z, uA2, uR2); p.x = b.x; p.z = b.y;                    // right half over the left
  float c = cos(uTilt), s = sin(uTilt);                                   // held in a hand: a slight turn
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}
void main() {
  vec3 p = fold(aUV);
  vec3 px = fold(aUV + vec2(0.003, 0.0));
  vec3 py = fold(aUV - vec2(0.0, 0.003));
  vN = cross(px - p, py - p);
  vUV = vec2(mix(aUV.x, 1.0 - aUV.x, uFlip), aUV.y); vP = p;   // mirrored picture, same sheet
  vec3 q = p - vec3(0.0, 0.5, uD);
  float n = 0.1, f = 20.0;
  gl_Position = vec4(q.x * uF / uAsp, q.y * uF, q.z * (f + n) / (n - f) + 2.0 * f * n / (n - f), -q.z);
}`;

  const FS = `
precision mediump float;
uniform sampler2D uTex; uniform float uDf, uPass;
varying vec2 vUV; varying vec3 vN; varying vec3 vP;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec4 t = texture2D(uTex, vUV);
  if (uPass < 0.5) { if (t.a < 0.5) discard; }            // solid paper writes depth
  else if (t.a >= 0.5 || t.a < 0.02) discard;            // then its soft edge, blended
  vec3 V = normalize(vec3(0.0, 0.5, uDf) - vP);
  vec3 n = normalize(vN);
  bool front = dot(n, V) > 0.0;
  if (!front) n = -n;
  vec3 L = normalize(vec3(-0.35, 0.6, 0.72));
  float flatD = L.z;
  float shade = (0.4 + 0.6 * max(dot(n, L), 0.0)) / (0.4 + 0.6 * flatD);
  float spec = pow(max(dot(n, normalize(L + V)), 0.0), 28.0) * 0.07 * (1.0 - abs(n.z));
  vec3 col;
  if (front) col = t.rgb;
  else {                                                  // the plain back of the cardstock
    float g = hash(floor(vUV * 520.0)) * 0.03 + hash(floor(vUV * 90.0)) * 0.02;
    col = vec3(0.94, 0.905, 0.84) - g;
  }
  gl_FragColor = vec4(col * shade + spec, t.a);
}`;

  const ease = x => x * x * (3 - 2 * x);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  function PaperFold(canvas, opts = {}) {
    const [mx, my] = opts.margin || [.35, .25];
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true })
      || canvas.getContext('experimental-webgl');
    if (!gl) return null;

    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) { console.warn('PaperFold:', e); return null; }
    gl.useProgram(prog);
    const U = {};
    ['uW', 'uA1', 'uA2', 'uR1', 'uR2', 'uC1', 'uTilt', 'uF', 'uAsp', 'uD', 'uDf', 'uTex', 'uPass', 'uFlip']
      .forEach(k => { U[k] = gl.getUniformLocation(prog, k); });

    // mesh: a fine grid over the image
    const NX = 44, NY = 66, uv = [], idx = [];
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) uv.push(i / NX, j / NY);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
    const aUV = gl.getAttribLocation(prog, 'aUV');
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const D = 4;
    gl.uniform1f(U.uD, D);
    gl.uniform1f(U.uDf, D);
    gl.uniform1f(U.uR1, .014);
    gl.uniform1f(U.uR2, .034);   // wider, so the second fold wraps around the first
    gl.uniform1f(U.uC1, .5);
    gl.uniform1i(U.uTex, 0);

    // textures: the picture drawn into a power-of-two canvas so it can be mipmapped
    const cache = new Map();
    let cur = null, W = .6, f = 0, flip = 0, loadingUrl = null;
    function texFor(url) {
      if (cache.has(url)) return Promise.resolve(cache.get(url));
      return new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => {
          const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
          c.getContext('2d').drawImage(im, 0, 0, 1024, 1024);
          const tex = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          const t = { tex, w: im.naturalWidth / im.naturalHeight };
          cache.set(url, t); res(t);
        };
        im.onerror = rej;
        im.src = url;
      });
    }

    function size() {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(2, global.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      draw();
    }
    function draw() {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (!cur) return;
      const hh = .5 + my, hw = W / 2 * (1 + 2 * mx);
      gl.uniform1f(U.uF, D / hh);
      gl.uniform1f(U.uAsp, hw / hh);
      gl.uniform1f(U.uW, W);
      gl.uniform1f(U.uFlip, flip);
      const a1 = Math.PI * .985 * ease(clamp(f / .56));
      const a2 = Math.PI * .97 * ease(clamp((f - .44) / .56));
      gl.uniform1f(U.uA1, a1);
      gl.uniform1f(U.uA2, a2);
      gl.uniform1f(U.uTilt, .32 * Math.sin(Math.PI * f) * (f < .5 ? 1 : .6));
      gl.bindTexture(gl.TEXTURE_2D, cur.tex);
      gl.depthMask(true); gl.uniform1f(U.uPass, 0);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
      gl.depthMask(false); gl.uniform1f(U.uPass, 1);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
      gl.depthMask(true);
    }

    new ResizeObserver(size).observe(canvas);
    return {
      image(url) {
        loadingUrl = url;
        return texFor(url).then(t => {
          if (loadingUrl !== url) return;
          cur = t; W = t.w; draw();
        });
      },
      preload(url) { return texFor(url).catch(() => {}); },
      fold(v) {
        v = clamp(v);
        if (Math.abs(v - f) < 1e-4 && cur) return;
        f = v; draw();
      },
      mirror(b) {
        b = b ? 1 : 0;
        if (b !== flip) { flip = b; draw(); }
      },
      get folded() { return f; },
    };
  }

  global.PaperFold = PaperFold;
})(window);
