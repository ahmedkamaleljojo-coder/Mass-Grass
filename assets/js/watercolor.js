/* Mass & Grass — watercolour engine.
   Paints soft, bleeding pigment blooms onto a canvas using stacked,
   recursively deformed polygons at very low opacity (the "layered wash"
   technique). Painting is spread over animation frames so each bloom
   visibly spreads across the paper. */
(function (global) {
  'use strict';

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gauss(r) {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Midpoint displacement: every edge grows a new vertex pushed off the line.
  function deform(pts, depth, r) {
    let out = pts;
    for (let d = 0; d < depth; d++) {
      const next = [];
      for (let i = 0; i < out.length; i++) {
        const a = out[i], b = out[(i + 1) % out.length];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const v = (a.v + b.v) / 2;
        const ang = r() * Math.PI * 2;
        const m = gauss(r) * len * 0.34 * v;
        next.push(a, {
          x: (a.x + b.x) / 2 + Math.cos(ang) * m,
          y: (a.y + b.y) / 2 + Math.sin(ang) * m,
          v: v * (0.82 + r() * 0.36)
        });
      }
      out = next;
    }
    return out;
  }

  function basePolygon(x, y, radius, r, sides) {
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const rr = radius * (0.82 + r() * 0.3);
      pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr, v: 0.55 + r() * 1.05 });
    }
    return deform(pts, 2, r);
  }

  function fillPoly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
  }

  /* Returns an iterator that paints `layers` translucent layers of one bloom.
     Call step(n) to paint n more layers; it returns true when done. */
  function bloom(ctx, opts) {
    const r = opts.rand || Math.random;
    const [cr, cg, cb] = hexToRgb(opts.color);
    const layers = opts.layers || 36;
    const alpha = opts.alpha || 0.03;
    const base = basePolygon(opts.x, opts.y, opts.radius, r, opts.sides || 9);
    let i = 0;
    return {
      step(n) {
        ctx.save();
        ctx.globalCompositeOperation = opts.blend || 'multiply';
        for (let k = 0; k < n && i < layers; k++, i++) {
          // Later layers spread slightly wider, like pigment wicking outwards.
          const spread = 1 + (i / layers) * (opts.spread || 0.12);
          const poly = deform(base.map(p => ({
            x: opts.x + (p.x - opts.x) * spread,
            y: opts.y + (p.y - opts.y) * spread,
            v: p.v
          })), 3, r);
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
          fillPoly(ctx, poly);
          // Occasional darker "tide line" layer gives the dried-edge look.
          if (opts.edges !== false && i % 9 === 4) {
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha * 0.9})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
        ctx.restore();
        return i >= layers;
      }
    };
  }

  /* A queue of blooms painted across animation frames. */
  function painter(ctx, perFrame) {
    const queue = [];
    let running = false;
    function tick() {
      let budget = perFrame || 3;
      while (budget > 0 && queue.length) {
        const job = queue[0];
        if (job.delay > 0) { job.delay -= 16; break; }
        if (job.it.step(1)) queue.shift();
        budget--;
      }
      if (queue.length) requestAnimationFrame(tick); else running = false;
    }
    return {
      add(opts, delay) {
        queue.push({ it: bloom(ctx, opts), delay: delay || 0 });
        if (!running) { running = true; requestAnimationFrame(tick); }
      },
      clear() { queue.length = 0; },
      get busy() { return queue.length > 0; }
    };
  }

  /* Paints a bloom synchronously (for thumbnails and generated textures). */
  function paintNow(ctx, opts) {
    const it = bloom(ctx, opts);
    while (!it.step(64)) { /* paint all layers */ }
  }

  /* Sizes a canvas for crisp rendering and returns its 2D context in CSS px. */
  function fit(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  /* A painted swatch returned as a data URL: used behind headline words. */
  function swatch(w, h, colors, seed) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = rng(seed || 7);
    colors.forEach((col, idx) => {
      paintNow(ctx, {
        x: colors.length === 1 ? w / 2 : w * (0.18 + idx * 0.64 / (colors.length - 1)),
        y: h * (0.5 + (r() - 0.5) * 0.2),
        radius: h * 0.38, color: col, layers: 26, alpha: 0.05,
        rand: r, sides: 7, spread: 0.2
      });
    });
    return c.toDataURL('image/png');
  }

  global.Watercolor = { rng, bloom, painter, paintNow, fit, swatch, hexToRgb };
})(window);
