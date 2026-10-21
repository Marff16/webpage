/* CV journey map: winds a trail down through the station pins, from the oldest at the top to the newest. */
(function () {
  const map = document.querySelector('.journey-map');
  if (!map) return;
  const svg = map.querySelector('.journey-path');
  const stations = [...map.querySelectorAll('.station')];

  function pinCentre(station) {
    const box = map.getBoundingClientRect();
    const r = station.querySelector('.station-pin').getBoundingClientRect();
    return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
  }

  function draw() {
    const pts = stations.map(pinCentre);
    // How far the trail swings sideways between two stops.
    const swing = 16;
    const roads = [], trails = [];

    function add(d, cls) {
      roads.push(`<path class="road" d="${d}"/>`);
      trails.push(`<path class="trail ${cls}" d="${d}"/>`);
    }

    const first = pts[0];
    add(`M${first.x} ${first.y - 70} L${first.x} ${first.y}`, 'trail--fade');

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const side = i % 2 ? 1 : -1;
      const dy = b.y - a.y;
      const d = `M${a.x} ${a.y} C${a.x + side * swing} ${a.y + dy * 0.4} ${b.x + side * swing} ${b.y - dy * 0.4} ${b.x} ${b.y}`;
      add(d, stations[i + 1].classList.contains('station--upcoming') ? 'trail--future' : '');
    }

    // The road keeps going past the last stop.
    const last = pts[pts.length - 1];
    add(`M${last.x} ${last.y} L${last.x} ${last.y + 70}`, 'trail--future trail--fade');

    svg.innerHTML = roads.join('') + trails.join('');
  }

  draw();
  window.addEventListener('resize', draw);
  window.addEventListener('load', draw);
  if (document.fonts) document.fonts.ready.then(draw);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

  map.classList.add('is-revealing');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15 });
  stations.forEach(s => observer.observe(s));
})();
