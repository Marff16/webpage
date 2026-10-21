/* Home page backdrop, in the monochrome style of Limbo: a misty coastline with distant mountains,
   drifting fog, crows and faint wind streaks, all driven by one gusting wind,
   under film grain and a vignette. With data-scene="night" (the 404 page) it is the open sea at night
   instead: no mountains, boats, crows or streaks, but stars and a moon, with the figure from the home page
   sitting in it and fishing. */
(function () {
  const canvas = document.querySelector('.wind');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const night = canvas.dataset.scene === 'night';

  const FOG = night ? '74, 84, 104' : '243, 238, 228';
  const GLOW = night ? '214, 222, 236' : '252, 249, 242';

  let width = 0, height = 0, horizon = 0;
  let sky = null, rays = null, far = null, vignette = null;
  let grain = [];
  let fog = [], streaks = [], birds = [], boats = [], stars = [];
  let nextStreak = 0;
  let clear = { top: 0, bottom: 0 };
  let crescent = null, fisher = null;

  function rand(min, max) { return min + Math.random() * (max - min); }

  // The band of the screen the name (and the figure perched on it) occupies, which crows and streaks keep out of.
  function measureName() {
    const parts = document.querySelectorAll('.home h1, .home .flyer');
    clear = { top: Infinity, bottom: -Infinity };
    parts.forEach(el => {
      const r = el.getBoundingClientRect();
      clear.top = Math.min(clear.top, r.top);
      clear.bottom = Math.max(clear.bottom, r.bottom);
    });
    if (!parts.length) clear = { top: 0, bottom: 0 };
  }

  // A random height between min and max that stays at least pad away from the name's band.
  function heightClearOfName(min, max, pad) {
    const lo = clear.top - pad, hi = clear.bottom + pad;
    const above = Math.max(0, Math.min(max, lo) - min);
    const below = Math.max(0, max - Math.max(min, hi));
    if (above + below === 0) return Math.min(min, lo);
    const r = rand(0, above + below);
    return r < above ? min + r : Math.max(min, hi) + (r - above);
  }

  // Wind strength at a given x and time. Evaluating it at (t - x / speed) makes
  // each gust roll across the screen from left to right instead of hitting everywhere at once.
  function wind(x, t) {
    const p = t - x / 420;
    return 0.55 + 0.32 * Math.sin(p * 0.33) + 0.18 * Math.sin(p * 0.87 + 1.3) + 0.07 * Math.sin(p * 2.1 + 0.4);
  }

  function layer() {
    const c = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = width * dpr;
    c.height = height * dpr;
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas: c, ctx: g };
  }

  // A softened copy of a layer, for depth of field on the distant layers.
  function blurred(src, px) {
    const out = layer();
    out.ctx.filter = `blur(${px}px)`;
    out.ctx.drawImage(src.canvas, 0, 0, width, height);
    out.ctx.filter = 'none';
    return out;
  }

  /* ── Sky: grey overcast with a pale glow breaking through, mirrored in the water ── */
  function buildSky() {
    sky = layer();
    const c = sky.ctx;
    const h = horizon / height;
    const base = c.createLinearGradient(0, 0, 0, height);
    const stops = night ? ['#0e121b', '#242b3a', '#1a1f2b', '#0f131b'] : ['#f6f2e9', '#f7f3ea', '#f4f0e7', '#f3efe5'];
    base.addColorStop(0, stops[0]);
    base.addColorStop(h - 0.001, stops[1]);
    base.addColorStop(h, stops[2]);
    base.addColorStop(1, stops[3]);
    c.fillStyle = base;
    c.fillRect(0, 0, width, height);

    // By day a pale glow breaking through the overcast; by night a smaller halo around the moon.
    const sx = width * (night ? 0.74 : 0.62), sy = height * (night ? 0.2 : 0.3), r = Math.max(width, height) * (night ? 0.3 : 0.75);
    const glow = c.createRadialGradient(sx, sy, 0, sx, sy, r);
    glow.addColorStop(0, `rgba(${GLOW}, ${night ? 0.2 : 0.9})`);
    glow.addColorStop(0.3, `rgba(${GLOW}, ${night ? 0.06 : 0.4})`);
    glow.addColorStop(1, `rgba(${GLOW}, 0)`);
    c.fillStyle = glow;
    c.fillRect(0, 0, width, horizon);

    if (night) {
      // A crescent: a disc with an offset disc cut out of it, drawn on its own layer.
      const moon = layer(), m = Math.min(width, height) * 0.045, mc = moon.ctx;
      crescent = { x: sx, y: sy, r: m };
      mc.fillStyle = 'rgba(238, 234, 222, 0.95)';
      mc.beginPath();
      mc.arc(sx, sy, m, 0, Math.PI * 2);
      mc.fill();
      // Cut with an opaque fill, or a trace of the full disc is left behind.
      mc.globalCompositeOperation = 'destination-out';
      mc.fillStyle = '#000';
      mc.beginPath();
      mc.arc(sx - m * 0.42, sy - m * 0.18, m * 0.86, 0, Math.PI * 2);
      mc.fill();
      c.drawImage(moon.canvas, 0, 0, width, height);
    }

    // The glow's reflection: a soft bright column on the water below it.
    c.save();
    c.beginPath();
    c.rect(0, horizon, width, height - horizon);
    c.clip();
    c.translate(sx, horizon);
    c.scale(0.3, 1);
    const shine = c.createRadialGradient(0, 0, 0, 0, 0, height - horizon);
    shine.addColorStop(0, `rgba(${GLOW}, ${night ? 0.22 : 0.45})`);
    shine.addColorStop(1, `rgba(${GLOW}, 0)`);
    c.fillStyle = shine;
    c.fillRect(-(height - horizon), 0, (height - horizon) * 2, height - horizon);
    c.restore();

    // Shafts of light slanting down through the haze; drawn over the fog, so kept separate. None at night.
    rays = layer();
    const rc = rays.ctx, ox = width * 0.74, oy = -height * 0.3, len = Math.hypot(width, height) * 1.2;
    for (let i = 0; i < (night ? 0 : 7); i++) {
      const a = rand(1.8, 2.35), spread = rand(0.015, 0.05);
      const g = rc.createLinearGradient(ox, oy, ox + Math.cos(a) * len, oy + Math.sin(a) * len);
      g.addColorStop(0, `rgba(${GLOW}, 0)`);
      g.addColorStop(0.3, `rgba(${GLOW}, ${rand(0.06, 0.12)})`);
      g.addColorStop(0.75, `rgba(${GLOW}, 0)`);
      rc.fillStyle = g;
      rc.beginPath();
      rc.moveTo(ox, oy);
      rc.lineTo(ox + Math.cos(a - spread) * len, oy + Math.sin(a - spread) * len);
      rc.lineTo(ox + Math.cos(a + spread) * len, oy + Math.sin(a + spread) * len);
      rc.fill();
    }
    rays = blurred(rays, 6);

    vignette = layer();
    const d = Math.hypot(width, height) / 2;
    const v = vignette.ctx.createRadialGradient(width / 2, height * 0.5, d * 0.3, width / 2, height * 0.5, d * 1.05);
    v.addColorStop(0, 'rgba(0, 0, 0, 0)');
    v.addColorStop(1, night ? 'rgba(0, 0, 0, 0.35)' : 'rgba(70, 55, 35, 0.035)');
    vignette.ctx.fillStyle = v;
    vignette.ctx.fillRect(0, 0, width, height);
  }

  // Film grain: a few tiles of noise, cycled and shifted every frame.
  function buildGrain() {
    for (let i = 0; i < 4; i++) {
      const n = document.createElement('canvas');
      n.width = n.height = 160;
      const g = n.getContext('2d');
      const img = g.createImageData(160, 160);
      for (let p = 0; p < img.data.length; p += 4) {
        img.data[p] = img.data[p + 1] = img.data[p + 2] = Math.random() * 255;
        img.data[p + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      grain.push(ctx.createPattern(n, 'repeat'));
    }
  }

  /* ── Far layer: distant mountains and the sea ── */
  function buildFar() {
    far = layer();
    const c = far.ctx;

    const haze = c.createLinearGradient(0, horizon - height * 0.3, 0, horizon);
    const hazeColour = night ? '62, 72, 92' : '247, 243, 234';
    haze.addColorStop(0, `rgba(${hazeColour}, 0)`);
    haze.addColorStop(1, `rgba(${hazeColour}, 0.3)`);
    c.fillStyle = haze;
    c.fillRect(0, horizon - height * 0.3, width, height * 0.3);

    // Two ranges across the water, fading out towards the middle of the screen.
    if (!night) [{ top: 0.11, color: 'rgba(125, 118, 106, 0.3)', end: 0.62 },
     { top: 0.06, color: 'rgba(98, 92, 82, 0.4)', end: 0.5 }].forEach(range => {
      const phases = [rand(0, 6), rand(0, 6), rand(0, 6)];
      c.beginPath();
      c.moveTo(0, horizon);
      for (let x = 0; x <= width * range.end; x += 6) {
        const k = x / (width * range.end);
        const envelope = Math.sin(Math.PI * Math.min(1, k * 1.15 + 0.1));
        const n = 0.55 + 0.25 * Math.sin(x / 140 + phases[0]) + 0.13 * Math.sin(x / 47 + phases[1]) + 0.07 * Math.sin(x / 13 + phases[2]);
        c.lineTo(x, horizon - height * range.top * envelope * n);
      }
      c.lineTo(width * range.end, horizon);
      c.closePath();
      c.fillStyle = range.color;
      c.fill();
    });

    c.beginPath();
    c.moveTo(0, horizon);
    c.lineTo(width, horizon);
    c.strokeStyle = night ? 'rgba(200, 210, 225, 0.16)' : 'rgba(88, 80, 68, 0.3)';
    c.lineWidth = 0.8;
    c.stroke();

    // Short wave dashes, packed tighter and shorter near the horizon.
    // At night a third of them gather under the moon, as a glittering path of moonlight.
    const dashes = Math.round((width * (height - horizon)) / 9000);
    for (let i = 0; i < dashes; i++) {
      const d = Math.random() ** 2;
      const y = horizon + 4 + d * (height - horizon);
      const x = night && i % 3 === 0 ? width * 0.74 + rand(-1, 1) * (20 + d * 120) : rand(0, width);
      const len = 6 + d * rand(20, 50);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + len, y);
      c.strokeStyle = `rgba(${GLOW}, ${rand(0.15, 0.35)})`;
      c.lineWidth = 0.7;
      c.stroke();
    }
    far = blurred(far, 1.5);
  }

  /* ── Crows ── */
  function makeBird(scattered) {
    const size = rand(6, 10) * Math.max(0.7, height / 900);
    return {
      x: scattered ? rand(0, width) : rand(-60, -20),
      // Padded for the wings and the slow bob up and down.
      y: heightClearOfName(0.22 * height, 0.5 * height, size + 12),
      size,
      speed: rand(14, 26),
      flap: rand(6, 9),
      phase: rand(0, Math.PI * 2),
    };
  }

  function drawBird(b, dt, t) {
    b.x += b.speed * (0.4 + 0.6 * wind(b.x, t)) * dt;
    b.y += Math.sin(t * 0.5 + b.phase) * 4 * dt;
    // Bursts of wingbeats between long glides.
    const glide = Math.max(0, Math.sin(t * 0.45 + b.phase));
    const s = b.size, lift = s * (0.2 + 0.35 * Math.sin(t * b.flap + b.phase) * glide);
    ctx.beginPath();
    ctx.moveTo(b.x - s, b.y - lift);
    ctx.quadraticCurveTo(b.x - s * 0.45, b.y - s * 0.45, b.x, b.y);
    ctx.quadraticCurveTo(b.x + s * 0.45, b.y - s * 0.45, b.x + s, b.y - lift);
    ctx.strokeStyle = 'rgba(17, 17, 17, 0.75)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  /* ── Sailboats ── */
  // Each boat sails from the bottom right towards a vanishing point under the far mountains.
  // depth runs from 0 at the horizon to 1 at the bottom edge; position and size scale with it.
  // Each boat eases towards its own resting depth under the mountains and stays there.
  const BOAT_START = 0.4;

  function makeBoat(depth, start) {
    const vanish = rand(0.18, 0.36);
    return {
      depth,
      rest: rand(0.03, 0.05),
      vanish,
      spread: (start - vanish) / depth,
      rate: rand(0.004, 0.006),
      phase: rand(0, Math.PI * 2),
    };
  }

  function drawBoat(b, dt, t) {
    const bx0 = (b.vanish + b.spread * b.depth) * width;
    b.depth = b.rest + (b.depth - b.rest) * Math.exp(-b.rate * (0.6 + 0.4 * wind(bx0, t)) * dt);

    const d = b.depth, sea = height - horizon;
    const bx = (b.vanish + b.spread * d) * width, by = horizon + d * sea, bs = d * sea * 0.3;
    // Paler as it recedes into the haze.
    const alpha = 0.4 + 0.45 * Math.min(1, d / BOAT_START);

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(Math.sin(t * 0.9 + b.phase) * 0.025);
    ctx.fillStyle = `rgba(48, 42, 34, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(-bs * 0.6, -bs * 0.16);
    ctx.lineTo(bs * 0.65, -bs * 0.16);
    ctx.lineTo(bs * 0.42, 0);
    ctx.lineTo(-bs * 0.45, 0);
    ctx.moveTo(0, -bs * 0.22);
    ctx.lineTo(0, -bs * 1.4);
    ctx.lineTo(bs * 0.5, -bs * 0.22);
    ctx.moveTo(-bs * 0.06, -bs * 1.25);
    ctx.lineTo(-bs * 0.5, -bs * 0.22);
    ctx.lineTo(-bs * 0.06, -bs * 0.22);
    ctx.fill();
    ctx.restore();

    // A broken reflection beneath it, shimmering slowly.
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = `rgba(48, 42, 34, ${alpha * (0.36 - i * 0.09)})`;
      const shift = Math.sin(t * 1.3 + b.phase + i * 2) * bs * 0.05;
      ctx.fillRect(bx - bs * (0.5 - i * 0.1) + shift, by + bs * (0.08 + i * 0.12), bs * (1 - i * 0.2), Math.max(1, bs * 0.03));
    }
  }

  /* ── Fog ── */
  function makeFog(band, scattered) {
    const rx = rand(160, 360) * Math.max(0.6, width / 1400);
    return {
      band,
      x: scattered ? rand(-rx, width + rx) : -rx,
      y: band === 0 ? horizon + rand(-0.03, 0.03) * height : horizon + rand(0.04, 0.12) * height,
      rx,
      ry: rx * rand(0.12, 0.22),
      alpha: rand(0.35, 0.7),
      speed: rand(4, 10),
    };
  }

  function drawFog(band, dt, t) {
    for (let i = 0; i < fog.length; i++) {
      const f = fog[i];
      if (f.band !== band) continue;
      f.x += f.speed * (0.4 + wind(f.x, t)) * dt;
      if (f.x - f.rx > width) fog[i] = makeFog(band, false);
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(1, f.ry / f.rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, f.rx);
      g.addColorStop(0, `rgba(${FOG}, ${f.alpha * (night ? 0.45 : 1)})`);
      g.addColorStop(1, `rgba(${FOG}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(-f.rx, -f.rx, f.rx * 2, f.rx * 2);
      ctx.restore();
    }
  }

  /* ── Wind streaks ── */
  function makeStreak() {
    const amp = rand(4, 10);
    return {
      x: rand(-0.2, 0.6) * width,
      y: heightClearOfName(0.08 * height, 0.6 * height, amp + 8),
      length: rand(120, 280),
      amp,
      phase: rand(0, Math.PI * 2),
      speed: rand(160, 260),
      age: 0,
      life: rand(2.5, 4),
    };
  }

  function drawStreak(s) {
    // Fade in, hold, fade out over the streak's life.
    const k = s.age / s.life;
    const alpha = 0.12 * Math.min(1, k * 4, (1 - k) * 4);
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const px = s.x - s.length + (s.length * i) / 24;
      const py = s.y + Math.sin(px / 70 + s.phase) * s.amp;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = `rgba(17, 17, 17, ${alpha * 1.5})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  /* ── Stars (night only) ── */
  // More of them high up, fading into the haze towards the horizon; a few brighter ones with a glint.
  function makeStars() {
    const out = [];
    const count = Math.round((width * horizon) / 3200);
    for (let i = 0; i < count; i++) {
      const y = horizon * 0.95 * Math.random() ** 1.4;
      const bright = Math.random() < 0.06;
      out.push({
        x: rand(0, width),
        y,
        r: bright ? rand(1.1, 1.6) : rand(0.35, 1),
        alpha: rand(0.35, 0.9) * (1 - (y / horizon) ** 3),
        bright,
        speed: rand(0.4, 1.6),
        phase: rand(0, Math.PI * 2),
      });
    }
    return out;
  }

  function drawStars(t) {
    for (const s of stars) {
      const a = s.alpha * (0.7 + 0.3 * Math.sin(t * s.speed + s.phase));
      ctx.fillStyle = `rgba(236, 232, 222, ${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (!s.bright) continue;
      ctx.strokeStyle = `rgba(236, 232, 222, ${a * 0.45})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(s.x - s.r * 3.5, s.y); ctx.lineTo(s.x + s.r * 3.5, s.y);
      ctx.moveTo(s.x, s.y - s.r * 3.5); ctx.lineTo(s.x, s.y + s.r * 3.5);
      ctx.stroke();
    }
  }

  /* ── The figure from the home page, sitting in the crescent with a line out (night only) ── */
  // Drawn in the units of the home page's SVG, where his seat is (28.5, 44.4), onto a small sprite that
  // is then given a faint glow of moonlight, so the dark silhouette still reads against the night sky.
  const FIG = { left: 16, top: 4, w: 80, h: 58, seat: [28.5, 44.4], tip: [90, 8] };
  const INK = '#0b0d12';
  const TORSO = new Path2D('M25.4 33.6 Q28.4 32.2 31.8 33.4 L32.8 44 L25 44.6Z');
  const HAIR = new Path2D('M22.8 27.6 Q21.4 26.6 21.8 25.4 Q21.6 21.6 24.4 19.8 Q26.4 18.4 28.4 18.6 Q28.6 17 29.8 15.8 Q29.8 17.2 30.6 18 Q31.6 16.8 33.4 16.4 Q32.6 17.6 32.6 18.6 Q34 18.6 35 17.8 Q34.8 19.4 34.4 19.8 Q35.6 20.8 35.8 22.4 Q35.2 22.2 34.8 22.8Z');
  // Each leg: how far ahead it is in its swing (s), its points, and the foot.
  const LEGS = [[0, [27, 44, 31.2, 47.8, 31.6, 55.4], 32.4, 55.9], [0.9, [30.4, 43.6, 35.2, 47.2, 35.8, 54.8], 36.6, 55.3]];
  // The numeral his line is caught on.
  const fourAnchor = document.querySelector('.not-found-code > span:last-child');

  function makeFisher() {
    const k = crescent.r / 40, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = document.createElement('canvas');
    c.width = Math.ceil(FIG.w * k * dpr);
    c.height = Math.ceil(FIG.h * k * dpr);
    const g = c.getContext('2d');
    // Mirrored from the home page: seated at the bottom of the crescent's hollow with his back to its lit
    // edge, facing out over the hollow, legs over the front.
    const right = FIG.left + FIG.w;
    g.setTransform(-k * dpr, 0, 0, k * dpr, right * k * dpr, -FIG.top * k * dpr);
    const seatX = crescent.x - crescent.r * 0.42, seatY = crescent.y + crescent.r * 0.68;
    return { canvas: c, ctx: g, k, dpr, x: seatX - (right - FIG.seat[0]) * k, y: seatY - (FIG.seat[1] - FIG.top) * k };
  }

  function polyline(g, pts, w) {
    g.lineWidth = w;
    g.beginPath();
    for (let i = 0; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.stroke();
  }

  function drawFisher(t) {
    const f = fisher, g = f.ctx;
    g.clearRect(FIG.left, FIG.top, FIG.w, FIG.h);
    g.fillStyle = g.strokeStyle = INK;
    g.lineCap = g.lineJoin = 'round';

    // His legs swing gently, out of step with each other, as on the home page.
    for (const [ahead, pts, fx, fy] of LEGS) {
      g.save();
      g.translate(28, 44);
      g.rotate((0.5 + 5.5 * Math.sin((t + ahead) * Math.PI / 1.8)) * Math.PI / 180);
      g.translate(-28, -44);
      polyline(g, pts, 1.9);
      g.beginPath();
      g.ellipse(fx, fy, 1.4, 0.8, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    polyline(g, [26.4, 34.4, 29.4, 39.4, 36.2, 33.4], 1.4);
    g.fill(TORSO);
    g.fill(HAIR);
    g.beginPath();
    g.arc(29, 26.2, 6.3, 0, Math.PI * 2);
    g.fill();
    polyline(g, [31.2, 34.6, 34.4, 38.6, 37, 32.8], 1.4);
    g.beginPath();
    g.arc(37, 32.6, 0.95, 0, Math.PI * 2);
    g.fill();

    // The rod, held at the hand and bending a little under its own weight.
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(33.6, 36);
    g.quadraticCurveTo(57.7, 11.9, FIG.tip[0], FIG.tip[1]);
    g.stroke();

    // Glowing eyes with a blink every few seconds.
    const p = (t % 5.3) / 5.3;
    const open = p < 0.94 ? 1 : p < 0.96 ? 1 - 45 * (p - 0.94) : 0.1 + 22.5 * (p - 0.96);
    for (const [ex, ey, r] of [[31.8, 25.4, 1.5], [34.2, 25, 1.3]]) {
      g.save();
      g.translate(ex, ey);
      g.scale(1, open);
      g.fillStyle = 'rgba(255, 255, 255, 0.35)';
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(0, 0, r * 0.48, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }

    ctx.save();
    ctx.shadowColor = 'rgba(214, 222, 236, 0.45)';
    ctx.shadowBlur = 4 * f.dpr;
    ctx.drawImage(f.canvas, f.x, f.y, FIG.w * f.k, FIG.h * f.k);
    ctx.restore();

    // He has hooked the last "4": the line runs from the rod tip to the top of its stem, sagging a little
    // more in the lulls between gusts. It ends just inside the numeral, which is drawn over the canvas.
    if (!fourAnchor) return;
    const tx = f.x + (FIG.left + FIG.w - FIG.tip[0]) * f.k, ty = f.y + (FIG.tip[1] - FIG.top) * f.k;
    const r = fourAnchor.getBoundingClientRect();
    const hx = r.left + r.width * 0.78, hy = r.top + r.height * 0.13;
    const sag = Math.hypot(hx - tx, hy - ty) * (0.12 - 0.06 * wind(tx, t));
    ctx.strokeStyle = 'rgba(214, 222, 236, 0.55)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo((tx + hx) / 2, (ty + hy) / 2 + sag, hx, hy);
    ctx.stroke();
  }

  /* ── Loop ── */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    horizon = height * 0.64;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    measureName();

    buildSky();
    buildFar();
    fisher = night ? makeFisher() : null;

    fog = [];
    const puffs = Math.round(Math.min(10, Math.max(4, width / 220)));
    for (let i = 0; i < puffs; i++) fog.push(makeFog(i % 2, true));

    // Three boats spread out at different distances, already under way. Their positions are
    // relative to the screen, so a resize keeps them where they are on their journey.
    if (night) boats = [];
    else if (!boats.length) boats = [[0.4, 0.86], [0.32, 0.74], [0.26, 0.93]].map(([d, x]) => makeBoat(d, x));

    birds = [];
    if (!night) for (let i = 0; i < (width < 700 ? 2 : 4); i++) birds.push(makeBird(true));

    stars = night ? makeStars() : [];
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;

    if (!night && t > nextStreak) {
      streaks.push(makeStreak());
      // Gusty moments bring streaks more often.
      nextStreak = t + rand(1.5, 3.5) / Math.max(wind(width / 2, t), 0.3);
    }

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(sky.canvas, 0, 0, width, height);
    drawStars(t);
    if (fisher) drawFisher(t);
    ctx.drawImage(far.canvas, 0, 0, width, height);
    for (let i = 0; i < boats.length; i++) {
      drawBoat(boats[i], dt, t);
    }
    drawFog(0, dt, t);
    drawFog(1, dt, t);

    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 0.23);
    ctx.drawImage(rays.canvas, 0, 0, width, height);
    ctx.globalAlpha = 1;

    for (let i = 0; i < birds.length; i++) {
      if (birds[i].x > width + 40) birds[i] = makeBird(false);
      drawBird(birds[i], dt, t);
    }

    streaks = streaks.filter(s => (s.age += dt) < s.life);
    for (const s of streaks) {
      s.x += s.speed * dt;
      drawStreak(s);
    }

    // Grain, shifted every frame so the tiles never line up, then the vignette with a faint projector flicker.
    const gx = rand(0, 160), gy = rand(0, 160);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.1;
    ctx.translate(-gx, -gy);
    ctx.fillStyle = grain[Math.floor(t * 24) % grain.length];
    ctx.fillRect(0, 0, width + gx, height + gy);
    ctx.restore();
    ctx.globalAlpha = 0.92 + 0.08 * Math.random();
    ctx.drawImage(vignette.canvas, 0, 0, width, height);
    ctx.globalAlpha = 1;

    if (!reducedMotion) requestAnimationFrame(frame);
  }

  buildGrain();
  resize();
  // The name's size changes once its web font arrives; re-measure without rebuilding the scene.
  if (document.fonts) document.fonts.ready.then(() => {
    measureName();
    birds = birds.map(b => (b.y > clear.top - b.size - 12 && b.y < clear.bottom + b.size + 12 ? makeBird(true) : b));
    // A still scene is drawn only once; redraw it so the fishing line still meets the "4" after the font swap.
    if (reducedMotion) requestAnimationFrame(frame);
  });
  window.addEventListener('resize', () => {
    resize();
    if (reducedMotion) requestAnimationFrame(frame);
  });
  requestAnimationFrame(frame);
})();
