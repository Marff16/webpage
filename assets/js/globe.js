/* CV story: an ink globe that follows the journey. Scrolling through the stations (or picking a year
   on the timeline) zooms out and back in on the place of each station. */
(function () {
  const story = document.querySelector('.story');
  const data = window.GLOBE_DATA;
  if (!story || !data) return;

  const stage = story.querySelector('.story-stage');
  const canvas = story.querySelector('.globe');
  const ctx = canvas.getContext('2d');
  const intro = story.querySelector('.story-intro');
  const stations = [...story.querySelectorAll('.station')];
  const yearsEl = story.querySelector('.story-years');
  const mobileQuery = window.matchMedia('(max-width: 860px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const INK = '17, 17, 17';
  const UPCOMING = '74, 127, 165';
  const RIVER = '88, 118, 140';
  const RAD = Math.PI / 180;

  /* ── Geometry: everything lives on the unit sphere as [x, y, z] ── */
  function vec(lon, lat) {
    const l = lon * RAD, p = lat * RAD;
    return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
  }

  // Flat [lon, lat, ...] → flat [x, y, z, ...].
  function toVectors(flat) {
    const out = new Float32Array(flat.length / 2 * 3);
    for (let i = 0, j = 0; i < flat.length; i += 2, j += 3) {
      const v = vec(flat[i], flat[i + 1]);
      out[j] = v[0]; out[j + 1] = v[1]; out[j + 2] = v[2];
    }
    return out;
  }

  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function angle(a, b) { return Math.acos(Math.max(-1, Math.min(1, dot(a, b)))); }

  function slerp(a, b, t) {
    const w = angle(a, b);
    if (w < 1e-6) return a.slice();
    const s = Math.sin(w), p = Math.sin((1 - t) * w) / s, q = Math.sin(t * w) / s;
    return [a[0] * p + b[0] * q, a[1] * p + b[1] * q, a[2] * p + b[2] * q];
  }

  const clamp01 = x => Math.max(0, Math.min(1, x));
  const smooth = x => x * x * (3 - 2 * x);
  // Between two chapters the globe rests near each end and only travels through the middle.
  const travel = f => smooth(clamp01((f - 0.2) / 0.6));

  const dots = toVectors(data.dots);
  const coast = data.coast.map(toVectors);
  const borders = data.borders.map(toVectors);
  const bordersD = data.bordersD.map(toVectors);
  const rivers = data.rivers.map(toVectors);

  // Detailed land is clipped to regions; the stretches along a region's edge are not coast.
  const onRegionEdge = (lon1, lat1, lon2, lat2) => data.regions.some(([x0, x1, y0, y1]) =>
    (lon1 === lon2 && (lon1 === x0 || lon1 === x1)) || (lat1 === lat2 && (lat1 === y0 || lat1 === y1)));
  const landD = data.landD.map(flat => {
    const skip = new Uint8Array(flat.length / 2);
    for (let i = 2; i < flat.length; i += 2) skip[i / 2] = onRegionEdge(flat[i - 2], flat[i - 1], flat[i], flat[i + 1]) ? 1 : 0;
    return { pts: toVectors(flat), skip };
  });

  const graticule = [];
  for (let lon = -180; lon < 180; lon += 15) {
    const line = [];
    for (let lat = -90; lat <= 90; lat += 3) line.push(lon, lat);
    graticule.push(toVectors(line));
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const line = [];
    for (let lon = -180; lon <= 180; lon += 3) line.push(lon, lat);
    graticule.push(toVectors(line));
  }

  const places = stations.map(s => ({
    v: vec(+s.dataset.lon, +s.dataset.lat),
    zoom: +(s.dataset.zoom || 12),
    name: s.dataset.place,
    year: s.querySelector('.station-year').textContent.trim(),
    upcoming: s.classList.contains('station--upcoming'),
    current: s.classList.contains('station--current'),
  }));

  /* ── Camera: chapter 0 is the intro (a slow spin), chapter i is station i - 1 ── */
  function view(i, t) {
    if (i === 0) return { f: vec(-20 - t * 4, 28), k: 1 };
    const pl = places[i - 1];
    return { f: pl.v, k: pl.zoom };
  }

  function camera(p, t) {
    const n = places.length;
    if (p >= n) return view(n, t);
    const i = Math.floor(p);
    return transition(view(i, t), view(i + 1, t), travel(p - i));
  }

  function transition(a, b, f) {
    // Three calm steps: zoom out until both places are in view (always pulling back a little), glide
    // across at that height, then zoom in on the next place.
    const w = angle(a.f, b.f);
    const out = Math.max(1, Math.min(1.5 / (w + 1e-6), a.k / 2.5, b.k / 2.5));
    if (f < 1 / 3) {
      const g = smooth(f * 3);
      return { f: a.f, k: Math.exp(Math.log(a.k) + (Math.log(out) - Math.log(a.k)) * g) };
    }
    if (f < 2 / 3) return { f: slerp(a.f, b.f, smooth(f * 3 - 1)), k: out };
    const g = smooth(f * 3 - 2);
    return { f: b.f, k: Math.exp(Math.log(out) + (Math.log(b.k) - Math.log(out)) * g) };
  }

  /* ── Drawing ── */
  let size = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = canvas.getBoundingClientRect().width;
    // Resizing clears the canvas, so only when the size has really changed (it does on every frame
    // while the phone layout shrinks the globe, and the ResizeObserver follows up with the same size).
    const px = Math.round(size * dpr);
    if (canvas.width === px) return;
    canvas.width = canvas.height = px;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function render(cam, active, t) {
    const f = cam.f, zoom = cam.k;
    const c = size / 2, R = size * 0.4 * zoom;
    const lon0 = Math.atan2(f[1], f[0]), lat0 = Math.asin(Math.max(-1, Math.min(1, f[2])));
    // Screen axes: east and north at the centre of the view, so north always points up.
    const e0 = -Math.sin(lon0), e1 = Math.cos(lon0);
    const n0 = -Math.sin(lat0) * Math.cos(lon0), n1 = -Math.sin(lat0) * Math.sin(lon0), n2 = Math.cos(lat0);
    const sx = (x, y) => c + R * (x * e0 + y * e1);
    const sy = (x, y, z) => c - R * (x * n0 + y * n1 + z * n2);

    // What shows at this zoom: dots for land from afar, filled detailed land, borders and rivers up close.
    const dotsA = clamp01((3.5 - zoom) / 1.5);
    const detail = clamp01((zoom - 2.5) / 1.5);
    const riversA = clamp01((zoom - 5) / 4);

    function polyline(arr) {
      let down = false;
      for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i], y = arr[i + 1], z = arr[i + 2];
        if (x * f[0] + y * f[1] + z * f[2] < 0) { down = false; continue; }
        if (down) ctx.lineTo(sx(x, y), sy(x, y, z));
        else { ctx.moveTo(sx(x, y), sy(x, y, z)); down = true; }
      }
    }

    function stroke(lines, colour, alpha, width) {
      if (alpha <= 0.01) return;
      ctx.beginPath();
      lines.forEach(l => polyline(l));
      ctx.strokeStyle = `rgba(${colour}, ${alpha})`;
      ctx.lineWidth = width;
      ctx.stroke();
    }

    ctx.clearRect(0, 0, size, size);

    // A soft shadow on the paper, then the sphere lit from the upper left.
    if (zoom < 1.4) {
      const shadow = ctx.createRadialGradient(c, c + R * 0.05, R * 0.7, c, c + R * 0.05, R * 1.08);
      shadow.addColorStop(0, `rgba(${INK}, 0.12)`);
      shadow.addColorStop(1, `rgba(${INK}, 0)`);
      ctx.fillStyle = shadow;
      ctx.fillRect(0, 0, size, size);
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, R, 0, Math.PI * 2);
    const body = ctx.createRadialGradient(c - R * 0.38, c - R * 0.42, R * 0.05, c, c, R);
    body.addColorStop(0, '#fdfbf6');
    body.addColorStop(0.65, '#f2ecdf');
    body.addColorStop(1, '#e2d9c6');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.clip();

    stroke(graticule, INK, 0.07, 0.6);

    // Land as ink dots, fading towards the limb so the sphere reads as round.
    if (dotsA > 0.01) {
      const r = Math.max(0.6, size / 420) * Math.min(1.6, Math.sqrt(zoom));
      const tiers = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      for (let i = 0; i < dots.length; i += 3) {
        const x = dots[i], y = dots[i + 1], z = dots[i + 2];
        const d = x * f[0] + y * f[1] + z * f[2];
        if (d <= 0) continue;
        const px = sx(x, y), py = sy(x, y, z);
        if (px < -r || py < -r || px > size + r || py > size + r) continue;
        const tier = tiers[Math.min(3, Math.floor(d * 4))];
        tier.moveTo(px + r, py);
        tier.arc(px, py, r, 0, Math.PI * 2);
      }
      tiers.forEach((tier, i) => {
        ctx.fillStyle = `rgba(${INK}, ${(0.16 + i * 0.13) * dotsA})`;
        ctx.fill(tier);
      });
    }

    // Close up: detailed land as a light wash with its coastline. Only near Europe and the US west
    // coast, which is where the camera zooms in.
    if (detail > 0.01) {
      ctx.beginPath();
      landD.forEach(({ pts }) => {
        let started = false;
        for (let i = 0; i < pts.length; i += 3) {
          const x = sx(pts[i], pts[i + 1]), y = sy(pts[i], pts[i + 1], pts[i + 2]);
          if (started) ctx.lineTo(x, y); else { ctx.moveTo(x, y); started = true; }
        }
        ctx.closePath();
      });
      ctx.fillStyle = `rgba(${INK}, ${0.07 * detail})`;
      ctx.fill();

      ctx.beginPath();
      landD.forEach(({ pts, skip }) => {
        let down = false;
        for (let i = 0; i < pts.length; i += 3) {
          const x = sx(pts[i], pts[i + 1]), y = sy(pts[i], pts[i + 1], pts[i + 2]);
          if (down && !skip[i / 3]) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          down = true;
        }
      });
      ctx.strokeStyle = `rgba(${INK}, ${0.55 * detail})`;
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }

    stroke(coast, INK, 0.5 * (1 - detail), 0.8);
    stroke(borders, INK, 0.18 * (1 - detail), 0.5);
    ctx.setLineDash([4, 3]);
    stroke(bordersD, INK, 0.35 * detail, 0.7);
    ctx.setLineDash([]);
    stroke(rivers, RIVER, 0.55 * riversA, 1);

    // Shade the rim.
    if (zoom < 1.4) {
      const rim = ctx.createRadialGradient(c, c, R * 0.6, c, c, R);
      rim.addColorStop(0, `rgba(${INK}, 0)`);
      rim.addColorStop(1, `rgba(${INK}, 0.1)`);
      ctx.fillStyle = rim;
      ctx.fillRect(0, 0, size, size);
    }
    ctx.restore();

    if (R < size) {
      ctx.beginPath();
      ctx.arc(c, c, R, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${INK}, 0.65)`;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }

    // Only the place of the current station: a pin, ringed and named.
    const pl = places[active];
    if (!pl || dot(pl.v, f) <= 0.05) return;
    const x = sx(pl.v[0], pl.v[1]), y = sy(pl.v[0], pl.v[1], pl.v[2]);
    if (x < -20 || y < -20 || x > size + 20 || y > size + 20) return;
    const colour = pl.upcoming ? UPCOMING : INK;

    if (pl.current && !reducedMotion) {
      const k = (t % 2.2) / 2.2;
      ctx.beginPath();
      ctx.arc(x, y, 4 + k * 12, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${INK}, ${0.6 * (1 - k)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = pl.upcoming ? '#f7f3ea' : `rgb(${INK})`;
    ctx.fill();
    ctx.setLineDash(pl.upcoming ? [2, 2] : []);
    ctx.strokeStyle = `rgb(${colour})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(x, y, 8.5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${colour}, 0.8)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // No room for the name once the globe has shrunk into the phone layout's bar.
    if (size < 160) return;
    ctx.font = 'italic 17px Newsreader, Georgia, serif';
    ctx.textBaseline = 'middle';
    const left = x > size * 0.68, lx = x + (left ? -14 : 14);
    ctx.textAlign = left ? 'right' : 'left';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(247, 243, 234, 0.9)';
    ctx.strokeText(pl.name, lx, y);
    ctx.fillStyle = `rgb(${colour})`;
    ctx.fillText(pl.name, lx, y);
  }

  /* ── Timeline: one entry per year, the current one centred with its neighbours either side ── */
  const years = [];
  places.forEach((pl, i) => {
    if (!years.length || years[years.length - 1].year !== pl.year) years.push({ year: pl.year, index: i, upcoming: pl.upcoming });
  });

  // Under the years, one bar per station in its colour, spanning the dates of its main roles, so you
  // can still see what is running (uni, say) after the story has moved on.
  const MONTHS = 'JanFebMarAprMayJunJulAugSepOctNovDec';
  const events = stations.map(s => {
    const dates = [...s.querySelectorAll('.station-role:not(.station-role--extra) .station-date')]
      .flatMap(d => [...d.textContent.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+(\d{4})/g)])
      .map(m => +m[2] + MONTHS.indexOf(m[1]) / 36);
    return {
      start: Math.min(...dates),
      end: Math.max(...dates) + 1 / 12,
      colour: getComputedStyle(s).getPropertyValue('--event').trim() || `rgb(${INK})`,
      name: s.querySelector('.station-place').textContent.split(' · ')[0],
    };
  });

  // Time → slot position: slot i covers the years from its own up to the next one shown.
  const slotYears = years.map(y => +y.year);
  function slotX(time) {
    const last = slotYears.length - 1;
    if (time >= slotYears[last]) return last + time - slotYears[last];
    let i = 0;
    while (i < last - 1 && time >= slotYears[i + 1]) i++;
    return i + (time - slotYears[i]) / (slotYears[i + 1] - slotYears[i]);
  }

  // Overlapping events go on separate lanes.
  const laneEnds = [];
  events.forEach(e => {
    let lane = laneEnds.findIndex(end => end <= e.start);
    if (lane < 0) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = e.end;
    e.lane = lane;
  });

  yearsEl.innerHTML = '<div class="story-years-track"><div class="story-years-row">' + years.map(y =>
    `<button type="button" class="story-year${y.upcoming ? ' story-year--upcoming' : ''}" data-index="${y.index}">${y.year}</button>`
  ).join('') + `</div><div class="story-lanes" style="--lanes: ${laneEnds.length}" aria-hidden="true">` + events.map(e => {
    const x0 = slotX(e.start), x1 = slotX(e.end);
    return `<span class="story-lane" title="${e.name}" style="--lane: ${e.lane}; left: calc(${x0.toFixed(3)} * var(--year-slot)); ` +
      `width: calc(${(x1 - x0).toFixed(3)} * var(--year-slot)); background: ${e.colour}"></span>`;
  }).join('') + '</div></div>';
  const track = yearsEl.firstChild;
  // The phone layout places the years by this height; it depends on how many lanes there are.
  story.style.setProperty('--years-h', `${yearsEl.offsetHeight}px`);
  const yearButtons = [...track.querySelectorAll('.story-year')];
  const laneBars = [...track.querySelectorAll('.story-lane')];
  let shownYear = null, shownStation = null;

  function showYear(active) {
    if (active !== shownStation) {
      shownStation = active;
      stations.forEach((s, i) => s.classList.toggle('is-active', i === active));
      // Bright: whatever is still running when this station begins. Before the first, all alike.
      const now = active >= 0 ? events[active].start : null;
      laneBars.forEach((bar, i) => bar.classList.toggle('is-on', now === null || (events[i].start <= now && now < events[i].end)));
    }
    let yi = -1;
    years.forEach((y, i) => { if (y.index <= active) yi = i; });
    if (yi === shownYear) return;
    shownYear = yi;
    // Slots are a fixed width, so centring a year is a plain offset; -1 is the empty slot before the first.
    track.style.transform = `translateX(calc(50% - ${yi + 0.5} * var(--year-slot)))`;
    yearButtons.forEach((b, i) => {
      const gap = Math.abs(i - yi);
      b.classList.toggle('is-current', gap === 0);
      b.classList.toggle('is-near', gap === 1);
      b.tabIndex = gap <= 1 ? 0 : -1;
      if (gap === 0) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
  }

  /* ── Scroll position → story progress ── */
  // Phones: how far the globe has shrunk into its bar, from 0 at the top of the page to 1 once the
  // intro has scrolled up by as much as the large globe reaches below the bar.
  let shrinkFrom = 0, shrinkOver = 1;

  function measureShrink() {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    shrinkFrom = parseFloat(getComputedStyle(stage).top) || 0;
    // The intro's top padding is that overhang plus 1.5rem of breathing room (see style.css).
    shrinkOver = Math.max(1, parseFloat(getComputedStyle(intro).paddingTop) - 1.5 * rem);
  }

  function updateShrink() {
    if (!mobileQuery.matches) { story.style.removeProperty('--shrink'); return; }
    const k = clamp01((shrinkFrom - story.getBoundingClientRect().top) / shrinkOver);
    story.style.setProperty('--shrink', k.toFixed(4));
    resize();
  }

  function focusLine() {
    if (!mobileQuery.matches) return window.innerHeight * 0.5;
    const h = stage.getBoundingClientRect().height;
    return h + (window.innerHeight - h) * 0.45;
  }

  function goal() {
    const y = focusLine();
    const centres = [intro, ...stations].map(el => {
      const r = el.getBoundingClientRect();
      return r.top + r.height / 2;
    });
    if (y <= centres[0]) return 0;
    for (let i = 0; i < centres.length - 1; i++) {
      if (y < centres[i + 1]) return i + (y - centres[i]) / (centres[i + 1] - centres[i]);
    }
    return centres.length - 1;
  }

  function goTo(i) {
    const r = stations[i].getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top + r.height / 2 - focusLine(), behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  yearsEl.addEventListener('click', e => {
    const b = e.target.closest('.story-year');
    if (b) goTo(+b.dataset.index);
  });
  const start = story.querySelector('.story-start');
  if (start) start.addEventListener('click', () => goTo(0));
  // Back up to the intro: the globe pulls straight out to the whole earth instead of rewinding through
  // every station on the way. Scrolling during the trip takes over again, and the globe glides back to
  // wherever the scroll has got to.
  const SHORTCUT_MS = 1400;
  let shortcut = null; // { from, start, home }: home is true on the way up, false on the way back

  function shortcutCamera(now, t) {
    const f = Math.min(1, (now - shortcut.start) / SHORTCUT_MS);
    return transition(shortcut.from, shortcut.home ? view(0, t) : camera(progress, t), f);
  }

  const back = story.querySelector('.story-back');
  if (back) back.addEventListener('click', () => {
    if (!reducedMotion) {
      const now = performance.now(), t = now / 1000;
      shortcut = { from: shortcut ? shortcutCamera(now, t) : camera(progress, t), start: now, home: true };
    }
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    if (start) start.focus({ preventScroll: true });
  });

  function takeOver() {
    if (!shortcut || !shortcut.home) return;
    const now = performance.now();
    shortcut = { from: shortcutCamera(now, now / 1000), start: now, home: false };
  }

  const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
  window.addEventListener('wheel', takeOver, { passive: true });
  window.addEventListener('touchstart', takeOver, { passive: true });
  window.addEventListener('keydown', e => { if (SCROLL_KEYS.includes(e.key)) takeOver(); });
  window.addEventListener('pointerdown', e => { if (e.target.closest('.scroll-thumb')) takeOver(); });

  /* ── Loop, only while the story is on screen ── */
  let progress = goal(), last = performance.now(), running = false;

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const target = goal();
    progress = reducedMotion ? target : progress + (target - progress) * Math.min(1, dt * 2.5);
    const t = reducedMotion ? 0 : now / 1000;
    if (shortcut) {
      const done = now - shortcut.start >= SHORTCUT_MS;
      // On the way up it ends once the page is back at the top, and the story picks up from the intro.
      if (done && shortcut.home && window.scrollY <= 1) { shortcut = null; progress = target; }
      else if (done && !shortcut.home) shortcut = null;
    }
    const active = shortcut && shortcut.home ? -1 : Math.round(progress) - 1;
    updateShrink();
    render(shortcut ? shortcutCamera(now, t) : camera(progress, t), active, t);
    showYear(active);
    requestAnimationFrame(frame);
  }

  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); requestAnimationFrame(frame); }
  }

  resize();
  measureShrink();
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', measureShrink);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => setRunning(entries[0].isIntersecting)).observe(story);
  } else {
    setRunning(true);
  }
})();
