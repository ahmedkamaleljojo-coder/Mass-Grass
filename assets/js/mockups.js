/* Mass & Grass — automatic mockups.
   Give a template one artwork image and it paints a finished product scene:
   perspective mapping for flat surfaces, cylindrical wrapping for bottles
   and mugs, die-cut borders for stickers, and multiply printing on fabric.
   Every template is drawn in code, so any uploaded artwork works at once. */
(function (global) {
  'use strict';
  const MW = 900, MH = 1125;   // 4:5 canvas used by every template

  /* ---------- helpers ---------- */
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.min(typeof r === 'number' ? r : 0, w / 2, h / 2);
      this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
    };
  }
  let noiseC;
  function noise() {
    if (noiseC) return noiseC;
    noiseC = document.createElement('canvas'); noiseC.width = noiseC.height = 180;
    const x = noiseC.getContext('2d'), d = x.createImageData(180, 180);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    return noiseC;
  }
  function grain(ctx, a) {
    ctx.save(); ctx.globalAlpha = a || .07; ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(noise(), 'repeat'); ctx.fillRect(0, 0, MW, MH); ctx.restore();
  }
  function vgrad(ctx, y0, y1, stops) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  }
  function wall(ctx, top, bottom) { ctx.fillStyle = vgrad(ctx, 0, MH, [top, bottom]); ctx.fillRect(0, 0, MW, MH); }
  function floor(ctx, y, top, bottom) { ctx.fillStyle = vgrad(ctx, y, MH, [top, bottom]); ctx.fillRect(0, y, MW, MH - y); }
  function windowLight(ctx, strength) {
    ctx.save(); ctx.globalCompositeOperation = 'soft-light';
    const g = ctx.createLinearGradient(0, 0, MW, MH);
    g.addColorStop(0, `rgba(255,246,226,${strength || .9})`); g.addColorStop(.55, 'rgba(255,246,226,.1)'); g.addColorStop(1, 'rgba(70,45,25,.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, MW, MH); ctx.restore();
  }
  function shadow(ctx, blur, ox, oy, col) { ctx.shadowBlur = blur; ctx.shadowOffsetX = ox; ctx.shadowOffsetY = oy; ctx.shadowColor = col; }
  function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function dims(img) { return [img.naturalWidth || img.width, img.naturalHeight || img.height]; }
  function crop(img, aspect) {
    const [iw, ih] = dims(img);
    let sw = iw, sh = iw / aspect;
    if (sh > ih) { sh = ih; sw = ih * aspect; }
    return { sx: (iw - sw) / 2, sy: (ih - sh) / 2, sw, sh };
  }
  function cover(ctx, img, x, y, w, h) { const c = crop(img, w / h); ctx.drawImage(img, c.sx, c.sy, c.sw, c.sh, x, y, w, h); }
  function contain(ctx, img, x, y, w, h) {
    const [iw, ih] = dims(img); const k = Math.min(w / iw, h / ih);
    ctx.drawImage(img, x + (w - iw * k) / 2, y + (h - ih * k) / 2, iw * k, ih * k);
  }
  function soft(ctx, x, y, rx, ry, a) { // soft contact shadow
    ctx.save(); const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, `rgba(55,35,18,${a || .35})`); g.addColorStop(1, 'rgba(55,35,18,0)');
    ctx.fillStyle = g; ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
    ctx.beginPath(); ctx.arc(x, y, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  /* Map an image onto any four-cornered surface (tl, tr, br, bl). */
  function tri(ctx, img, s, d) {
    const [x0, y0, x1, y1, x2, y2] = s, [u0, v0, u1, v1, u2, v2] = d;
    const det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (!det) return;
    const a = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) / det;
    const c = ((u2 - u0) * (x1 - x0) - (u1 - u0) * (x2 - x0)) / det;
    const b = ((v1 - v0) * (y2 - y0) - (v2 - v0) * (y1 - y0)) / det;
    const dd = ((v2 - v0) * (x1 - x0) - (v1 - v0) * (x2 - x0)) / det;
    const e = u0 - a * x0 - c * y0, f = v0 - b * x0 - dd * y0;
    const cx = (u0 + u1 + u2) / 3, cy = (v0 + v1 + v2) / 3, grow = p => [p[0] + Math.sign(p[0] - cx) * 1.4, p[1] + Math.sign(p[1] - cy) * 1.4];
    const p0 = grow([u0, v0]), p1 = grow([u1, v1]), p2 = grow([u2, v2]);
    ctx.save(); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.closePath(); ctx.clip();
    ctx.transform(a, b, c, dd, e, f); ctx.drawImage(img, 0, 0); ctx.restore();
  }
  function lerpQuad(q, u, v) {
    return {
      x: (1 - v) * ((1 - u) * q[0].x + u * q[1].x) + v * ((1 - u) * q[3].x + u * q[2].x),
      y: (1 - v) * ((1 - u) * q[0].y + u * q[1].y) + v * ((1 - u) * q[3].y + u * q[2].y)
    };
  }
  function quad(ctx, img, q, n) {
    n = n || 14;
    const w = Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y), h = Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y);
    const c = crop(img, w / h);
    const S = (u, v) => [c.sx + u * c.sw, c.sy + v * c.sh];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const u0 = i / n, u1 = (i + 1) / n, v0 = j / n, v1 = (j + 1) / n;
      const A = lerpQuad(q, u0, v0), B = lerpQuad(q, u1, v0), C = lerpQuad(q, u1, v1), D = lerpQuad(q, u0, v1);
      tri(ctx, img, [...S(u0, v0), ...S(u1, v0), ...S(u1, v1)], [A.x, A.y, B.x, B.y, C.x, C.y]);
      tri(ctx, img, [...S(u0, v0), ...S(u1, v1), ...S(u0, v1)], [A.x, A.y, C.x, C.y, D.x, D.y]);
    }
  }
  function fillQuad(ctx, q) { ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); }

  /* Wrap an image around a cylinder (bottle, mug). */
  function cylinder(ctx, img, cx, top, R, h, half, fit) {
    half = half || 1.15;
    const [iw, ih] = dims(img);
    const arc = 2 * half * R;
    let c;
    if (fit === 'contain') {           // keep the whole sticker visible
      const k = Math.min(arc / iw, h / ih);
      const aw = iw * k, ah = ih * k;
      half = aw / (2 * R); top += (h - ah) / 2; h = ah;
      c = { sx: 0, sy: 0, sw: iw, sh: ih };
    } else c = crop(img, arc / h);
    const n = 80;
    for (let k = 0; k < n; k++) {
      const t0 = -half + 2 * half * k / n, t1 = -half + 2 * half * (k + 1) / n;
      const x0 = cx + R * Math.sin(t0), x1 = cx + R * Math.sin(t1);
      ctx.drawImage(img, c.sx + c.sw * k / n, c.sy, c.sw / n + .5, c.sh, x0, top, Math.max(.6, x1 - x0 + .4), h);
    }
  }
  function cylShade(ctx, x, y, w, h, r) {
    ctx.save(); rrect(ctx, x, y, w, h, r); ctx.clip();
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(40,25,12,.42)'); g.addColorStop(.18, 'rgba(40,25,12,.08)'); g.addColorStop(.32, 'rgba(255,250,240,.28)');
    g.addColorStop(.42, 'rgba(255,250,240,0)'); g.addColorStop(.78, 'rgba(40,25,12,.12)'); g.addColorStop(1, 'rgba(40,25,12,.5)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
  }

  /* Die-cut sticker: white border that follows the artwork's outline. */
  const stickerCache = new WeakMap();
  function hasAlpha(img) {
    const t = document.createElement('canvas'); t.width = t.height = 24;
    const x = t.getContext('2d'); x.drawImage(img, 0, 0, 24, 24);
    const d = x.getImageData(0, 0, 24, 24).data;
    for (const i of [3, 23 * 4 + 3, 23 * 24 * 4 + 3, (24 * 24 - 1) * 4 + 3]) if (d[i] < 200) return true;
    return false;
  }
  function sticker(img) {
    if (stickerCache.has(img)) return stickerCache.get(img);
    const [iw, ih] = dims(img); const k = 520 / Math.max(iw, ih);
    const w = Math.round(iw * k), h = Math.round(ih * k), b = 22;
    const c = document.createElement('canvas'); c.width = w + b * 2; c.height = h + b * 2;
    const x = c.getContext('2d');
    if (hasAlpha(img)) {
      const s = document.createElement('canvas'); s.width = w; s.height = h;
      const sx = s.getContext('2d'); sx.drawImage(img, 0, 0, w, h);
      sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#FFFDF8'; sx.fillRect(0, 0, w, h);
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) x.drawImage(s, b + Math.cos(a) * b, b + Math.sin(a) * b);
      x.drawImage(img, b, b, w, h);
    } else {
      x.fillStyle = '#FFFDF8'; rrect(x, 0, 0, c.width, c.height, 44); x.fill();
      x.save(); rrect(x, b, b, w, h, 26); x.clip(); x.drawImage(img, b, b, w, h); x.restore();
    }
    // a faint gloss band across the vinyl
    x.save(); x.globalCompositeOperation = 'source-atop';
    const g = x.createLinearGradient(0, 0, c.width, c.height);
    g.addColorStop(.3, 'rgba(255,255,255,0)'); g.addColorStop(.42, 'rgba(255,255,255,.22)'); g.addColorStop(.52, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height); x.restore();
    stickerCache.set(img, c);
    return c;
  }
  function placeSticker(ctx, img, cx, cy, size, rot) {
    const s = sticker(img); const k = size / Math.max(s.width, s.height);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot * Math.PI / 180);
    shadow(ctx, 14, 3, 6, 'rgba(50,30,15,.3)');
    ctx.drawImage(s, -s.width * k / 2, -s.height * k / 2, s.width * k, s.height * k); ctx.restore();
  }

  /* Print artwork onto fabric: multiply so the weave and folds show through. */
  function printOn(ctx, clipPath, img, x, y, w, h) {
    ctx.save(); ctx.clip(clipPath); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .94;
    cover(ctx, img, x, y, w, h); ctx.restore();
  }
  function folds(ctx, clipPath, lines) {
    ctx.save(); ctx.clip(clipPath); ctx.globalCompositeOperation = 'multiply';
    lines.forEach(([x0, y0, x1, y1, wdt, a]) => {
      const g = ctx.createLinearGradient(x0 - wdt, y0, x0 + wdt, y0);
      g.addColorStop(0, 'rgba(90,60,35,0)'); g.addColorStop(.5, `rgba(90,60,35,${a})`); g.addColorStop(1, 'rgba(90,60,35,0)');
      ctx.strokeStyle = g; ctx.lineWidth = wdt; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + 20, (y0 + y1) / 2, x1, y1); ctx.stroke();
    });
    ctx.restore();
  }

  function calendarGrid(ctx, x, y, w, h, ink) {
    ctx.save(); ctx.fillStyle = ink || 'rgba(51,37,27,.55)';
    ctx.font = `600 ${Math.round(h / 9)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let d = 1; const cw = w / 7, ch = h / 5;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) {
      if (r === 0 && c < 3) continue;
      if (d > 31) break;
      ctx.globalAlpha = c === 6 ? 1 : .8;
      ctx.fillStyle = c === 6 ? '#B0603A' : (ink || 'rgba(51,37,27,.55)');
      ctx.fillText(String(d++), x + cw * (c + .5), y + ch * (r + .5));
    }
    ctx.restore();
  }
  function rings(ctx, x0, x1, y, n) {
    for (let i = 0; i < n; i++) {
      const x = x0 + (x1 - x0) * (i + .5) / n;
      ctx.fillStyle = 'rgba(40,30,22,.85)'; ctx.beginPath(); ctx.arc(x, y + 8, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3B3029'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 11, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    }
  }
  const HOODIE = new Path2D('M72 36 C84 28 116 28 128 36 L164 56 L186 124 L166 132 L152 98 L152 184 L48 184 L48 98 L34 132 L14 124 L36 56 Z');
  function scaled(path, s, tx, ty) { const p = new Path2D(); p.addPath(path, new DOMMatrix([s, 0, 0, s, tx, ty])); return p; }

  /* ---------- templates ---------- */
  const T = [];
  const add = (id, product, ar, en, kind, draw) => T.push({ id, product, name: { ar, en }, kind, draw });

  // Paintings ---------------------------------------------------------
  add('P1', 'paintings', 'إطار خشب على الحائط', 'Oak frame on a wall', 'art', (x, art) => {
    wall(x, '#EFE4D1', '#E1CFB2'); floor(x, 985, '#CDAE86', '#B8966C');
    x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, 985, MW, 3);
    const fx = 190, fy = 170, fw = 520, fh = 650, t = 26, m = 58;
    shadow(x, 46, 16, 30, 'rgba(60,36,16,.38)'); x.fillStyle = '#C39A6B'; x.fillRect(fx, fy, fw, fh); noShadow(x);
    x.strokeStyle = 'rgba(90,60,30,.5)'; x.lineWidth = 2; x.strokeRect(fx + 1, fy + 1, fw - 2, fh - 2); x.strokeRect(fx + t, fy + t, fw - t * 2, fh - t * 2);
    x.fillStyle = '#F8F3EA'; x.fillRect(fx + t, fy + t, fw - t * 2, fh - t * 2);
    x.fillStyle = vgrad(x, fy + t, fy + t + 18, ['rgba(60,40,20,.18)', 'rgba(60,40,20,0)']); x.fillRect(fx + t, fy + t, fw - t * 2, 18);
    cover(x, art, fx + t + m, fy + t + m, fw - (t + m) * 2, fh - (t + m) * 2);
    x.strokeStyle = 'rgba(60,40,20,.25)'; x.lineWidth = 1.5; x.strokeRect(fx + t + m, fy + t + m, fw - (t + m) * 2, fh - (t + m) * 2);
    windowLight(x, .8); grain(x);
  });
  add('P2', 'paintings', 'مسنودة على رف', 'Leaning on a shelf', 'art', (x, art) => {
    wall(x, '#E8DAC3', '#D9C4A3');
    const q = [{ x: 250, y: 300 }, { x: 610, y: 292 }, { x: 640, y: 900 }, { x: 222, y: 906 }];
    shadow(x, 40, 20, 18, 'rgba(55,33,15,.4)'); x.fillStyle = '#3D3029'; fillQuad(x, q); x.fill(); noShadow(x);
    const mat = [lerpQuad(q, .05, .04), lerpQuad(q, .95, .04), lerpQuad(q, .95, .96), lerpQuad(q, .05, .96)];
    x.fillStyle = '#F6F0E4'; fillQuad(x, mat); x.fill();
    quad(x, art, [lerpQuad(q, .15, .12), lerpQuad(q, .85, .12), lerpQuad(q, .85, .88), lerpQuad(q, .15, .88)]);
    // shelf
    shadow(x, 30, 0, 20, 'rgba(55,33,15,.35)'); x.fillStyle = vgrad(x, 900, 940, ['#B68A5D', '#94693F']); x.fillRect(60, 900, 780, 40); noShadow(x);
    x.fillStyle = 'rgba(255,240,215,.4)'; x.fillRect(60, 900, 780, 3);
    // clay vase with grass
    x.strokeStyle = '#7F8F5A'; x.lineWidth = 4; x.lineCap = 'round';
    [[720, 735, 690, 560], [728, 735, 745, 540], [735, 735, 790, 590], [724, 735, 715, 600]].forEach(([a, b, c, d]) => { x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo((a + c) / 2 + 10, (b + d) / 2, c, d); x.stroke(); });
    shadow(x, 16, 6, 8, 'rgba(55,33,15,.3)'); x.fillStyle = '#B0603A';
    x.beginPath(); x.moveTo(705, 730); x.quadraticCurveTo(665, 800, 690, 898); x.lineTo(770, 898); x.quadraticCurveTo(795, 800, 755, 730); x.closePath(); x.fill(); noShadow(x);
    windowLight(x, .7); grain(x);
  });
  add('P3', 'paintings', 'طبعة بشريط لاصق', 'Taped print', 'art', (x, art) => {
    wall(x, '#F1E7D7', '#E4D4BB');
    x.save(); x.translate(450, 540); x.rotate(-2 * Math.PI / 180);
    const w = 560, h = 720;
    shadow(x, 30, 8, 22, 'rgba(60,36,16,.3)'); x.fillStyle = '#FBF7EF'; x.fillRect(-w / 2, -h / 2, w, h); noShadow(x);
    cover(x, art, -w / 2 + 38, -h / 2 + 38, w - 76, h - 110);
    x.fillStyle = 'rgba(51,37,27,.55)'; x.font = 'italic 22px Georgia, serif'; x.textAlign = 'center'; x.fillText('Mass & Grass', 0, h / 2 - 30);
    [[-w / 2 + 40, -h / 2 - 6, -35], [w / 2 - 40, -h / 2 - 6, 32]].forEach(([tx, ty, r]) => {
      x.save(); x.translate(tx, ty); x.rotate(r * Math.PI / 180); x.fillStyle = 'rgba(214,188,146,.8)'; x.fillRect(-60, -18, 120, 36); x.restore();
    });
    x.restore(); windowLight(x, .6); grain(x);
  });

  // Stickers ----------------------------------------------------------
  add('S1', 'stickers', 'على لابتوب', 'On a laptop', 'sticker', (x, art) => {
    wall(x, '#E9DDCA', '#DCCBAF');
    shadow(x, 50, 0, 30, 'rgba(50,30,15,.35)'); x.fillStyle = vgrad(x, 150, 990, ['#98A38E', '#7E8B75']); rrect(x, 110, 150, 680, 840, 36); x.fill(); noShadow(x);
    x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 2; rrect(x, 112, 152, 676, 836, 34); x.stroke();
    placeSticker(x, art, 470, 540, 400, -7);
    placeSticker(x, art, 250, 290, 180, 13);
    placeSticker(x, art, 650, 850, 160, -16);
    windowLight(x, .6); grain(x);
  });
  add('S2', 'stickers', 'على مطرة ماء', 'On a water bottle', 'sticker', (x, art) => {
    wall(x, '#E7D8C0', '#D6C0A0');
    soft(x, 450, 1010, 230, 36, .45);
    const cx = 450, R = 160, top = 300, h = 705;
    x.fillStyle = '#7F8F5A'; rrect(x, cx - R, top, R * 2, h, 70); x.fill();
    x.fillStyle = '#34291F'; rrect(x, cx - R * .62, 150, R * 1.24, 170, 26); x.fill();
    x.fillStyle = '#6E7C4E'; rrect(x, cx - R * .8, 292, R * 1.6, 40, 16); x.fill();
    cylinder(x, sticker(art), cx, 470, R, 400, 1.05, 'contain');
    cylShade(x, cx - R, top, R * 2, h, 70);
    x.save(); x.globalCompositeOperation = 'screen'; x.fillStyle = 'rgba(255,255,255,.12)'; rrect(x, cx - R * .55, 160, 18, 150, 9); x.fill(); x.restore();
    windowLight(x, .5); grain(x);
  });
  add('S3', 'stickers', 'ورقة ستيكرات', 'Sticker sheet', 'sticker', (x, art) => {
    wall(x, '#DCC8A8', '#CBB28C');
    shadow(x, 34, 6, 18, 'rgba(50,30,15,.3)'); x.fillStyle = '#F1EADD'; rrect(x, 150, 110, 600, 900, 18); x.fill(); noShadow(x);
    x.fillStyle = 'rgba(51,37,27,.5)'; x.font = '600 20px Georgia, serif'; x.fillText('Mass & Grass · stickers', 190, 975);
    [[310, 290, 250, -6], [590, 300, 200, 9], [300, 580, 190, 11], [590, 590, 250, -4], [320, 830, 210, 5], [590, 840, 180, -11]]
      .forEach(([cx, cy, s, r]) => placeSticker(x, art, cx, cy, s, r));
    windowLight(x, .5); grain(x);
  });

  // Calendars ---------------------------------------------------------
  add('C1', 'calendars', 'معلّق على الحائط', 'Hanging on a wall', 'art', (x, art) => {
    wall(x, '#EEE2CE', '#DFCBAB');
    x.strokeStyle = 'rgba(51,37,27,.55)'; x.lineWidth = 2; x.beginPath(); x.moveTo(250, 206); x.lineTo(450, 120); x.lineTo(650, 206); x.stroke();
    x.fillStyle = '#6B4A36'; x.beginPath(); x.arc(450, 118, 7, 0, Math.PI * 2); x.fill();
    const cx = 210, cy = 200, w = 480, h = 760;
    shadow(x, 40, 12, 26, 'rgba(60,36,16,.32)'); x.fillStyle = '#FBF7EF'; x.fillRect(cx, cy, w, h); noShadow(x);
    rings(x, cx + 20, cx + w - 20, cy + 4, 10);
    cover(x, art, cx + 26, cy + 40, w - 52, h * .5);
    x.fillStyle = '#33251B'; x.font = '700 34px Georgia, serif'; x.fillText('January', cx + 28, cy + h * .5 + 92);
    x.fillStyle = '#B0603A'; x.font = '700 26px Georgia, serif'; x.textAlign = 'right'; x.fillText('2027', cx + w - 28, cy + h * .5 + 92); x.textAlign = 'left';
    calendarGrid(x, cx + 26, cy + h * .5 + 120, w - 52, h * .5 - 150);
    windowLight(x, .7); grain(x);
  });
  add('C2', 'calendars', 'كاليندر مكتب', 'Desk calendar', 'art', (x, art) => {
    wall(x, '#EBDFCB', '#E1D0B4'); floor(x, 760, '#C7A277', '#A9825A');
    x.fillStyle = 'rgba(255,240,215,.35)'; x.fillRect(0, 760, MW, 3);
    soft(x, 470, 880, 330, 40, .5);
    const q = [{ x: 190, y: 330 }, { x: 690, y: 318 }, { x: 740, y: 872 }, { x: 150, y: 888 }];
    x.fillStyle = '#9C7A58'; x.beginPath(); x.moveTo(690, 318); x.lineTo(790, 840); x.lineTo(740, 872); x.closePath(); x.fill();
    shadow(x, 20, 0, 10, 'rgba(50,30,15,.25)'); x.fillStyle = '#FBF7EF'; fillQuad(x, q); x.fill(); noShadow(x);
    quad(x, art, [lerpQuad(q, .05, .06), lerpQuad(q, .95, .06), lerpQuad(q, .95, .62), lerpQuad(q, .05, .62)]);
    for (let i = 0; i < 9; i++) { const p = lerpQuad(q, (i + .5) / 9, 0); x.fillStyle = '#3B3029'; x.beginPath(); x.arc(p.x, p.y - 2, 6, 0, Math.PI * 2); x.fill(); }
    for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) {
      const a = lerpQuad(q, .08 + c * .126, .7 + r * .07);
      x.fillStyle = c === 6 ? 'rgba(176,96,58,.7)' : 'rgba(51,37,27,.35)'; x.fillRect(a.x, a.y, 30, 10);
    }
    windowLight(x, .6); grain(x);
  });
  add('C3', 'calendars', 'فلات لاي على الطاولة', 'Flat lay', 'art', (x, art) => {
    wall(x, '#E5D4B9', '#D8C4A4');
    x.save(); x.translate(430, 590); x.rotate(3 * Math.PI / 180);
    const w = 540, h = 780;
    shadow(x, 30, 8, 16, 'rgba(50,30,15,.3)'); x.fillStyle = '#FBF7EF'; x.fillRect(-w / 2, -h / 2, w, h); noShadow(x);
    rings(x, -w / 2 + 20, w / 2 - 20, -h / 2 + 4, 11);
    cover(x, art, -w / 2 + 28, -h / 2 + 40, w - 56, h * .52);
    x.fillStyle = '#33251B'; x.font = '700 32px Georgia, serif'; x.fillText('May', -w / 2 + 30, 60);
    calendarGrid(x, -w / 2 + 28, 90, w - 56, h / 2 - 120);
    x.restore();
    // pencil
    x.save(); x.translate(760, 820); x.rotate(-62 * Math.PI / 180); shadow(x, 10, 4, 6, 'rgba(50,30,15,.3)');
    x.fillStyle = '#C79A45'; x.fillRect(-170, -11, 300, 22); noShadow(x);
    x.fillStyle = '#EAD7B5'; x.beginPath(); x.moveTo(130, -11); x.lineTo(172, 0); x.lineTo(130, 11); x.fill();
    x.fillStyle = '#33251B'; x.beginPath(); x.moveTo(160, -3.5); x.lineTo(172, 0); x.lineTo(160, 3.5); x.fill(); x.restore();
    // cup
    shadow(x, 26, 8, 14, 'rgba(50,30,15,.35)'); x.fillStyle = '#F5EFE4'; x.beginPath(); x.arc(810, 150, 120, 0, Math.PI * 2); x.fill(); noShadow(x);
    x.fillStyle = '#6B4A36'; x.beginPath(); x.arc(810, 150, 92, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,240,220,.25)'; x.beginPath(); x.arc(790, 128, 40, 0, Math.PI * 2); x.fill();
    windowLight(x, .6); grain(x);
  });

  // Hoodies -----------------------------------------------------------
  function hoodie(x, art, color, tx, ty, s, area, back) {
    const p = scaled(HOODIE, s, tx, ty);
    shadow(x, 34, 6, 22, 'rgba(50,30,15,.35)'); x.fillStyle = color; x.fill(p); noShadow(x);
    if (back) {
      const hood = scaled(new Path2D('M72 36 C70 74 130 74 128 36 C116 30 84 30 72 36 Z'), s, tx, ty);
      x.fillStyle = 'rgba(80,55,30,.08)'; x.fill(hood); x.strokeStyle = 'rgba(80,55,30,.25)'; x.lineWidth = 2; x.stroke(hood);
    }
    printOn(x, p, art, tx + area[0] * s, ty + area[1] * s, area[2] * s, area[3] * s);
    folds(x, p, [[tx + 60 * s, ty + 70 * s, tx + 70 * s, ty + 180 * s, 30, .12], [tx + 140 * s, ty + 70 * s, tx + 132 * s, ty + 180 * s, 30, .12],
      [tx + 30 * s, ty + 70 * s, tx + 22 * s, ty + 124 * s, 22, .16], [tx + 170 * s, ty + 70 * s, tx + 178 * s, ty + 124 * s, 22, .16]]);
    x.save(); x.strokeStyle = 'rgba(80,55,30,.28)'; x.lineWidth = 2;
    if (!back) {
      x.stroke(scaled(new Path2D('M72 36 C74 64 126 64 128 36'), s, tx, ty));
      x.stroke(scaled(new Path2D('M70 150 H130 L138 176 H62 Z'), s, tx, ty));
      x.strokeStyle = 'rgba(245,238,225,.9)'; x.lineWidth = 4; x.stroke(scaled(new Path2D('M94 58 L92 80 M106 58 L108 80'), s, tx, ty));
    }
    x.strokeStyle = 'rgba(80,55,30,.22)'; x.lineWidth = 2; x.stroke(scaled(new Path2D('M48 174 H152 M152 98 L152 184 M48 98 L48 184'), s, tx, ty));
    x.restore();
  }
  add('H1', 'hoodies', 'أمامي مسطّح', 'Front flat lay', 'art', (x, art) => {
    wall(x, '#D8C4A2', '#C8B08A'); grain(x, .05);
    hoodie(x, art, '#EEE4D2', 30, 150, 4.2, [74, 72, 52, 52]); windowLight(x, .5); grain(x);
  });
  add('H2', 'hoodies', 'على علاقة', 'On a hanger', 'art', (x, art) => {
    wall(x, '#EDE1CC', '#DECAA9');
    x.strokeStyle = '#8A6A4A'; x.lineWidth = 7; x.lineCap = 'round';
    x.beginPath(); x.arc(450, 150, 26, Math.PI, Math.PI * 2.1); x.stroke();
    x.beginPath(); x.moveTo(450, 178); x.lineTo(450, 210); x.stroke();
    x.lineWidth = 14; x.beginPath(); x.moveTo(170, 300); x.quadraticCurveTo(450, 200, 730, 300); x.stroke();
    hoodie(x, art, '#C9CDB3', 60, 180, 3.9, [74, 72, 52, 52]); windowLight(x, .6); grain(x);
  });
  add('H3', 'hoodies', 'طبعة كبيرة على الظهر', 'Large back print', 'art', (x, art) => {
    wall(x, '#D2BE9C', '#BFA67E');
    hoodie(x, art, '#E7D8C2', 30, 150, 4.2, [60, 70, 80, 88], true); windowLight(x, .5); grain(x);
  });

  // Totes -------------------------------------------------------------
  function tote(x, art, q, color) {
    const p = new Path2D(); p.moveTo(q[0].x, q[0].y); q.slice(1).forEach(v => p.lineTo(v.x, v.y)); p.closePath();
    shadow(x, 34, 8, 22, 'rgba(50,30,15,.35)'); x.fillStyle = color; x.fill(p); noShadow(x);
    const a = lerpQuad(q, .18, .2), b = lerpQuad(q, .82, .76);
    printOn(x, p, art, a.x, a.y, b.x - a.x, b.y - a.y);
    folds(x, p, [[a.x - 20, q[0].y + 40, a.x, q[3].y - 20, 36, .1], [b.x + 20, q[1].y + 40, b.x, q[2].y - 20, 36, .1]]);
    x.save(); x.clip(p); x.fillStyle = 'rgba(90,60,35,.12)'; x.fillRect(Math.min(q[0].x, q[3].x), q[0].y, 900, 34); x.restore();
    return p;
  }
  add('T1', 'totes', 'معلّقة على خطّاف', 'Hanging on a hook', 'art', (x, art) => {
    wall(x, '#EEE2CE', '#DECBAC');
    x.fillStyle = '#8A6A4A'; x.beginPath(); x.arc(450, 170, 18, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#E3D5BC'; x.lineWidth = 24; x.lineCap = 'round';
    x.beginPath(); x.moveTo(300, 400); x.quadraticCurveTo(360, 190, 450, 178); x.stroke();
    x.beginPath(); x.moveTo(600, 400); x.quadraticCurveTo(540, 190, 450, 178); x.stroke();
    tote(x, art, [{ x: 240, y: 390 }, { x: 660, y: 390 }, { x: 690, y: 960 }, { x: 210, y: 960 }], '#EFE5D2');
    windowLight(x, .6); grain(x);
  });
  add('T2', 'totes', 'فلات لاي على خشب', 'Flat lay on wood', 'art', (x, art) => {
    wall(x, '#CDAC82', '#B99268');
    x.strokeStyle = 'rgba(80,50,25,.25)'; x.lineWidth = 2; for (let y = 0; y < MH; y += 150) { x.beginPath(); x.moveTo(0, y); x.lineTo(MW, y + 6); x.stroke(); }
    x.save(); x.translate(450, 610); x.rotate(-3 * Math.PI / 180); x.translate(-450, -610);
    x.strokeStyle = '#E6D9C1'; x.lineWidth = 26; x.lineCap = 'round';
    x.beginPath(); x.moveTo(320, 330); x.bezierCurveTo(300, 120, 440, 110, 420, 330); x.stroke();
    x.beginPath(); x.moveTo(480, 330); x.bezierCurveTo(470, 140, 620, 150, 580, 330); x.stroke();
    tote(x, art, [{ x: 200, y: 320 }, { x: 700, y: 320 }, { x: 700, y: 960 }, { x: 200, y: 960 }], '#F1E7D4');
    x.restore(); windowLight(x, .5); grain(x);
  });
  add('T3', 'totes', 'واقفة مع عشب', 'Standing, grass inside', 'art', (x, art) => {
    wall(x, '#ECDFC9', '#E0CDAE'); floor(x, 900, '#CFB089', '#B8966C');
    soft(x, 450, 985, 300, 30, .45);
    x.strokeStyle = '#7F8F5A'; x.lineWidth = 6; x.lineCap = 'round';
    for (let i = 0; i < 14; i++) { const bx = 290 + i * 24; x.beginPath(); x.moveTo(bx, 440); x.quadraticCurveTo(bx + (i % 2 ? 30 : -30), 330, bx + (i % 3 - 1) * 40, 250 + (i % 4) * 25); x.stroke(); }
    x.fillStyle = '#5A4632'; x.beginPath(); x.ellipse(450, 430, 205, 22, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#E3D5BC'; x.lineWidth = 22;
    x.beginPath(); x.moveTo(320, 430); x.quadraticCurveTo(350, 240, 420, 430); x.stroke();
    x.beginPath(); x.moveTo(480, 430); x.quadraticCurveTo(550, 240, 580, 430); x.stroke();
    tote(x, art, [{ x: 245, y: 430 }, { x: 655, y: 430 }, { x: 680, y: 985 }, { x: 220, y: 985 }], '#EDE2CD');
    windowLight(x, .6); grain(x);
  });

  // Postcards ---------------------------------------------------------
  function card(x, art, cx, cy, w, h, rot, border) {
    x.save(); x.translate(cx, cy); x.rotate(rot * Math.PI / 180);
    shadow(x, 22, 5, 12, 'rgba(50,30,15,.32)'); x.fillStyle = '#FBF7EF'; x.fillRect(-w / 2, -h / 2, w, h); noShadow(x);
    if (art) cover(x, art, -w / 2 + border, -h / 2 + border, w - border * 2, h - border * 2);
    x.restore();
  }
  add('PC1', 'postcards', 'مع ظرف وطابع', 'With envelope & stamp', 'art', (x, art) => {
    wall(x, '#E3D3B8', '#D3BD99');
    x.save(); x.translate(470, 380); x.rotate(7 * Math.PI / 180);
    shadow(x, 22, 5, 12, 'rgba(50,30,15,.3)'); x.fillStyle = '#D9C39E'; x.fillRect(-300, -200, 600, 400); noShadow(x);
    x.strokeStyle = 'rgba(90,60,30,.3)'; x.lineWidth = 2; x.beginPath(); x.moveTo(-300, -200); x.lineTo(0, 30); x.lineTo(300, -200); x.stroke();
    x.fillStyle = '#FBF7EF'; x.fillRect(180, -170, 90, 110); cover(x, art, 190, -160, 70, 90);
    x.restore();
    card(x, art, 430, 730, 640, 440, -4, 22);
    x.strokeStyle = 'rgba(176,96,58,.75)'; x.lineWidth = 3; x.beginPath(); x.moveTo(70, 1050); x.bezierCurveTo(300, 900, 520, 1100, 860, 960); x.stroke();
    windowLight(x, .5); grain(x);
  });
  add('PC2', 'postcards', 'مثبّتة على لوح فلّين', 'Pinned on cork', 'art', (x, art) => {
    wall(x, '#C49A6B', '#B38858');
    x.fillStyle = 'rgba(90,55,25,.35)'; for (let i = 0; i < 900; i++) { x.fillRect(Math.random() * MW, Math.random() * MH, 2, 2); }
    card(x, null, 250, 260, 330, 230, -8, 0); card(x, null, 700, 900, 300, 210, 10, 0);
    card(x, art, 450, 560, 660, 450, 3, 20);
    x.fillStyle = '#B0603A'; shadow(x, 6, 2, 4, 'rgba(0,0,0,.3)'); x.beginPath(); x.arc(455, 350, 16, 0, Math.PI * 2); x.fill(); noShadow(x);
    x.fillStyle = 'rgba(255,255,255,.4)'; x.beginPath(); x.arc(450, 345, 5, 0, Math.PI * 2); x.fill();
    windowLight(x, .5); grain(x);
  });
  add('PC3', 'postcards', 'مجموعة بطاقات', 'A fanned set', 'art', (x, art) => {
    wall(x, '#EADCC6', '#DAC6A6');
    card(x, null, 470, 600, 560, 390, 14, 0); card(x, null, 440, 580, 560, 390, 6, 0);
    card(x, art, 430, 560, 560, 390, -3, 18);
    x.fillStyle = 'rgba(51,37,27,.6)'; x.font = 'italic 24px Georgia, serif'; x.textAlign = 'center'; x.fillText('Mass & Grass · postcards', 450, 900);
    windowLight(x, .6); grain(x);
  });

  // More designs ------------------------------------------------------
  add('D1', 'designs', 'خلفية موبايل', 'Phone wallpaper', 'art', (x, art) => {
    wall(x, '#E4D4BA', '#D2BC98');
    shadow(x, 50, 12, 32, 'rgba(50,30,15,.4)'); x.fillStyle = '#2E2520'; rrect(x, 280, 170, 340, 740, 54); x.fill(); noShadow(x);
    x.save(); rrect(x, 294, 184, 312, 712, 42); x.clip(); cover(x, art, 294, 184, 312, 712); x.restore();
    x.fillStyle = '#1C1612'; rrect(x, 405, 200, 90, 26, 13); x.fill();
    x.fillStyle = '#FFFDF8'; x.font = '600 58px Georgia, serif'; x.textAlign = 'center'; x.fillText('9:41', 450, 320);
    windowLight(x, .5); grain(x);
  });
  add('D2', 'designs', 'غلاف دفتر', 'Notebook cover', 'art', (x, art) => {
    wall(x, '#D7C3A3', '#C6AE88');
    shadow(x, 34, 8, 20, 'rgba(50,30,15,.35)'); x.fillStyle = '#EFE6D6'; rrect(x, 232, 176, 460, 660, 14); x.fill(); noShadow(x);
    x.save(); rrect(x, 220, 166, 460, 660, 14); x.clip(); cover(x, art, 220, 166, 460, 660);
    x.fillStyle = 'rgba(40,25,12,.2)'; x.fillRect(220, 166, 26, 660); x.restore();
    x.fillStyle = '#3A2F27'; x.fillRect(610, 166, 22, 660);
    x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(612, 166, 4, 660);
    windowLight(x, .6); grain(x);
  });
  add('D3', 'designs', 'كوب', 'Mug', 'art', (x, art) => {
    wall(x, '#EDE1CC', '#E0CDAE'); floor(x, 820, '#CDAE86', '#B8966C');
    soft(x, 450, 900, 280, 34, .45);
    const cx = 420, R = 190, top = 380, h = 480;
    x.strokeStyle = '#F2ECE1'; x.lineWidth = 42; x.beginPath(); x.ellipse(cx + R + 20, top + 210, 70, 110, 0, -Math.PI / 2, Math.PI / 2); x.stroke();
    x.strokeStyle = 'rgba(60,40,20,.15)'; x.lineWidth = 4; x.stroke();
    x.fillStyle = '#F6F1E8'; rrect(x, cx - R, top, R * 2, h, 26); x.fill();
    cylinder(x, art, cx, top + 60, R, h - 120, 1.0);
    cylShade(x, cx - R, top, R * 2, h, 26);
    x.fillStyle = '#F6F1E8'; x.beginPath(); x.ellipse(cx, top, R, 34, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#5B3B26'; x.beginPath(); x.ellipse(cx, top + 4, R - 16, 24, 0, 0, Math.PI * 2); x.fill();
    windowLight(x, .6); grain(x);
  });

  /* ---------- public API ---------- */
  function render(canvas, id, art) {
    const t = T.find(v => v.id === id); if (!t || !art) return;
    canvas.width = MW; canvas.height = MH;
    const ctx = canvas.getContext('2d');
    ctx.save(); t.draw(ctx, art); ctx.restore();
  }
  global.Mockups = { templates: T, render, size: [MW, MH] };
})(window);
