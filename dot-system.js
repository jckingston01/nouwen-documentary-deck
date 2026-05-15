// dot-system.js — morphing dot field for the Nouwen Documentary Deck
//
// One persistent pool of dots. On each slide, dots morph into the motif
// formation (ladder, pews, terrain, frame, timeline, door). Non-formation
// dots scatter. All dots move on every transition — the shape EMERGES
// from the field, Truckee-style.

(() => {
  'use strict';

  const DW = 1920, DH = 1080, N = 3000;
  const CREAM = [236, 226, 207];
  const WARM  = [218, 196, 168];
  const MIST  = [148, 142, 128];
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ease(t) { return t < .5 ? 4*t*t*t : 1 - (-2*t+2)**3 / 2; }

  // ── Canvas ──────────────────────────────────────────────────────────

  const cvs = document.createElement('canvas');
  cvs.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1';
  document.body.appendChild(cvs);
  const ctx = cvs.getContext('2d');

  let dpr, W, H, sc, ox, oy;
  function resize() {
    dpr = devicePixelRatio || 1;
    W = innerWidth; H = innerHeight;
    cvs.width = W * dpr; cvs.height = H * dpr;
    cvs.style.width = W + 'px'; cvs.style.height = H + 'px';
    sc = Math.min(W / DW, H / DH);
    ox = (W - DW * sc) / 2; oy = (H - DH * sc) / 2;
  }
  const TX = x => ox + x * sc;
  const TY = y => oy + y * sc;
  const TS = s => s * sc;

  // ── Dot pool ────────────────────────────────────────────────────────

  const pos  = new Float32Array(N * 2); // current
  const src  = new Float32Array(N * 2); // morph start
  const dst  = new Float32Array(N * 2); // morph target
  const del  = new Float32Array(N);     // per-dot delay [0, ~0.5]
  const bri  = new Float32Array(N);     // current brightness 0→1
  const briD = new Float32Array(N);     // target brightness
  const ph   = new Float32Array(N);     // jitter phase
  const warm = new Uint8Array(N);       // 1 = use warm color

  for (let i = 0; i < N; i++) {
    pos[i*2] = Math.random() * DW;
    pos[i*2+1] = Math.random() * DH;
    ph[i] = Math.random() * Math.PI * 2;
  }
  src.set(pos); dst.set(pos);

  let morphT0 = -99, morphDur = 2, curName = null, ambAlpha = 0;
  let dotColor = CREAM.slice(), dotTarget = CREAM.slice();

  // ── Formation builders ──────────────────────────────────────────────
  // Each returns { pts: [{x, y, d, warm?}], dur }
  // d = normalized delay [0, ~0.5], dur = morph seconds

  function fLadder() {
    const p = [], L = 1696, R = 1736;
    for (let y = 30; y <= 1050; y += 14) {
      p.push({ x: L, y, d: 0 });
      p.push({ x: R, y, d: 0 });
    }
    for (let i = 0; i < 26; i++) {
      const y = 1040 - i * 40;
      const d = 0.05 + (i / 25) * 0.45;
      for (let j = 0; j < 8; j++)
        p.push({ x: L + (j / 7) * (R - L), y, d });
    }
    return { pts: p, dur: 3.0 };
  }

  function fPews() {
    const p = [];
    [[814,0,1920],[856,60,1860],[898,120,1800],[940,180,1740],[982,240,1680]]
      .forEach(([y, x0, x1], ri) => {
        const n = Math.round((x1 - x0) / 28);
        for (let i = 0; i <= n; i++)
          p.push({ x: x0 + (i / n) * (x1 - x0), y, d: ri * 0.06 });
      });
    return { pts: p, dur: 2.0 };
  }

  function fTerrain() {
    const p = [];
    [[1020,8,3,3,2],[970,15,2.5,5,3],[900,15,2,10,3.5],[830,15,2,10,3]]
      .forEach(([base, a1, f1, a2, f2], ci) => {
        for (let i = 0; i <= 70; i++) {
          const x = (i / 70) * DW, u = x / DW;
          const y = base - a1 * Math.sin(u * Math.PI * f1 + ci * .5)
                         - a2 * Math.cos(u * Math.PI * f2 + ci * 1.2);
          p.push({ x, y, d: ci * 0.07 + 0.04 });
        }
      });
    return { pts: p, dur: 2.5 };
  }

  function fFrame() {
    const p = [], hw = 850, hh = 477, sp = 20, cx = 960, cy = 540;
    for (let x = cx - hw; x <= cx + hw; x += sp) {
      p.push({ x, y: cy - hh, d: 0.08 });
      p.push({ x, y: cy + hh, d: 0.08 });
    }
    for (let y = cy - hh + sp; y < cy + hh; y += sp) {
      p.push({ x: cx - hw, y, d: 0.08 });
      p.push({ x: cx + hw, y, d: 0.08 });
    }
    [[cx-hw,cy-hh],[cx+hw,cy-hh],[cx-hw,cy+hh],[cx+hw,cy+hh]].forEach(([x, y]) => {
      [[-12,0],[12,0],[0,-12],[0,12],[0,0]].forEach(([dx, dy]) => {
        p.push({ x: x + dx, y: y + dy, d: 0 });
      });
    });
    return { pts: p, dur: 1.8 };
  }

  function fWaitline() {
    const p = [], y = 930, x0 = 200, x1 = 1720;
    for (let i = 0; i <= 100; i++) {
      const u = i / 100;
      p.push({ x: x0 + u * (x1 - x0), y, d: u * 0.5 });
    }
    for (let i = 1; i < 16; i++) {
      const u = i / 16, x = x0 + u * (x1 - x0);
      p.push({ x, y: y - 5, d: u * 0.5 });
      p.push({ x, y: y + 5, d: u * 0.5 });
    }
    for (let dy = -3; dy <= 3; dy += 2)
      for (let dx = -3; dx <= 3; dx += 2) {
        p.push({ x: x0 + dx, y: y + dy, d: 0 });
        p.push({ x: x1 + dx, y: y + dy, d: 0.5 });
      }
    return { pts: p, dur: 3.0 };
  }

  function fDoor() {
    const p = [], cx = 960, cy = 540;
    for (let i = 0; i < 280; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rr = Math.pow(Math.random(), 0.55);
      p.push({
        x: cx + Math.cos(ang) * rr * 290,
        y: cy + Math.sin(ang) * rr * 410,
        d: (1 - rr) * 0.35,
        warm: true,
      });
    }
    return { pts: p, dur: 2.5 };
  }

  // ── Registry ────────────────────────────────────────────────────────

  const MOTIFS = {
    ladder: fLadder(), pews: fPews(), terrain: fTerrain(),
    frame: fFrame(), waitline: fWaitline(), door: fDoor(),
  };

  const SLIDE_MOTIF = {
    '05 The climb':                'ladder',
    '09 The room was thin':        'pews',
    '10 The brother':              'pews',
    '14 Wilderness':               'terrain',
    '15 Took the ladders':         'terrain',
    '18 Remember the film':        'frame',
    '19 Greg':                     'frame',
    '20 Sixteen years ago':        'waitline',
    '28 The waiting line':         'waitline',
    '30 As long as it takes':      'door',
    '31 You are here to be loved': 'door',
    '32 Glad you are here':        'door',
  };

  // ── Morph ───────────────────────────────────────────────────────────

  function startMorph(name) {
    if (name === curName) return;
    curName = name;
    src.set(pos);

    const motif = name ? MOTIFS[name] : null;
    const pts = motif ? motif.pts : [];
    morphDur = motif ? motif.dur : 2.0;

    // Nearest-neighbor assignment: formation dots
    const used = new Set();
    for (const p of pts) {
      let best = -1, bd = Infinity;
      for (let i = 0; i < N; i++) {
        if (used.has(i)) continue;
        const dx = pos[i*2] - p.x, dy = pos[i*2+1] - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bd) { bd = d2; best = i; }
      }
      if (best >= 0) {
        used.add(best);
        dst[best*2] = p.x;
        dst[best*2+1] = p.y;
        del[best] = p.d || 0;
        briD[best] = 1;
        warm[best] = p.warm ? 1 : 0;
      }
    }

    // Scatter remaining dots
    for (let i = 0; i < N; i++) {
      if (!used.has(i)) {
        dst[i*2] = Math.random() * DW;
        dst[i*2+1] = Math.random() * DH;
        del[i] = 0;
        briD[i] = 0;
        warm[i] = 0;
      }
    }

    morphT0 = performance.now() / 1000;
  }

  // ── Color ───────────────────────────────────────────────────────────

  function tempForSlide(s) {
    if (!s) return CREAM;
    const c = s.classList;
    if (c.contains('warm-bg-strong')) return [240, 218, 186];
    if (c.contains('warm-bg'))        return [236, 220, 196];
    if (c.contains('mist-bg'))        return [200, 196, 188];
    if (c.contains('cold-bg'))        return [220, 218, 212];
    return CREAM;
  }

  // ── Render ──────────────────────────────────────────────────────────

  function render(now) {
    const t = now / 1000;
    const mt = REDUCED ? 1 : Math.min((t - morphT0) / morphDur, 1);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(TX(0), TY(0), TS(DW), TS(DH));
    ctx.clip();

    // Smooth color shift
    for (let k = 0; k < 3; k++)
      dotColor[k] += (dotTarget[k] - dotColor[k]) * 0.02;

    if (ambAlpha > 0 && ambAlpha < 1) ambAlpha = Math.min(1, ambAlpha + 0.008);

    for (let i = 0; i < N; i++) {
      // Morph interpolation with per-dot delay
      const d = del[i], span = 1 - d;
      const lt = span > 0 ? Math.max(0, Math.min(1, (mt - d) / span)) : 1;
      const e = ease(lt);

      let x = src[i*2]   + (dst[i*2]   - src[i*2])   * e;
      let y = src[i*2+1] + (dst[i*2+1] - src[i*2+1]) * e;

      // Idle jitter when morph complete
      if (mt >= 1) {
        x += Math.sin(t * 1.3 + ph[i]) * 0.7;
        y += Math.cos(t * 1.1 + ph[i] * 1.3) * 0.7;
      }

      pos[i*2] = x; pos[i*2+1] = y;

      // Brightness lerp
      bri[i] += (briD[i] - bri[i]) * 0.035;

      const alpha = (0.07 + bri[i] * 0.25) * ambAlpha;
      if (alpha < 0.003) continue;

      const r = 1.8 + bri[i] * 0.7;
      const px = TX(x), py = TY(y), pr = TS(r);
      const c = warm[i] ? WARM : dotColor;

      // Glow halo on formation dots
      if (bri[i] > 0.4) {
        ctx.globalAlpha = alpha * 0.12;
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.beginPath();
        ctx.arc(px, py, pr * 3.5, 0, 6.283);
        ctx.fill();
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, 6.283);
      ctx.fill();
    }

    // Waitline year labels
    if (curName === 'waitline' && mt > 0.1) {
      const la = Math.min(mt / 0.3, 1) * ambAlpha * 0.5;
      ctx.globalAlpha = la;
      ctx.fillStyle = `rgb(${MIST[0]},${MIST[1]},${MIST[2]})`;
      ctx.font = `300 ${TS(12)}px "Geist Mono", ui-monospace, monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('2009', TX(200), TY(948));
      ctx.fillText('2025', TX(1720), TY(948));
    }

    ctx.restore();
    requestAnimationFrame(render);
  }

  // ── Init ────────────────────────────────────────────────────────────

  resize();
  addEventListener('resize', resize);

  document.addEventListener('slidechange', e => {
    const s = e.detail?.slide;
    if (!s) return;
    const label = s.getAttribute('data-label') || '';
    startMorph(SLIDE_MOTIF[label] || null);
    dotTarget = tempForSlide(s);
    if (label !== '00 House lights' && ambAlpha === 0) ambAlpha = 0.001;
  });

  requestAnimationFrame(() => {
    const s = document.querySelector('[data-deck-active]');
    if (s) {
      const label = s.getAttribute('data-label') || '';
      if (label !== '00 House lights') ambAlpha = 1;
      dotTarget = tempForSlide(s);
      dotColor = dotTarget.slice();
      startMorph(SLIDE_MOTIF[label] || null);
    }
    requestAnimationFrame(render);
  });
})();
