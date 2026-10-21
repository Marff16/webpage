/* Overlay scrollbar: a faint thumb pinned to the right edge that takes no layout width. */
(function () {
  const root = document.documentElement;
  const thumb = document.createElement('div');
  thumb.className = 'scroll-thumb';
  thumb.setAttribute('aria-hidden', 'true');
  document.body.appendChild(thumb);

  const gap = 3; // keeps the thumb off the very top and bottom of the window

  function update() {
    const view = window.innerHeight;
    const total = root.scrollHeight;
    if (total <= view) { thumb.style.display = 'none'; return; }
    thumb.style.display = '';
    const track = view - gap * 2;
    // Half the usual proportional length, so it stays a short marker rather than a bar.
    const height = Math.max(24, track * view / total * 0.5);
    const offset = gap + (track - height) * window.scrollY / (total - view);
    thumb.style.height = `${height}px`;
    thumb.style.transform = `translateY(${offset}px)`;
  }

  // Dragging the thumb scrolls the page proportionally.
  thumb.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    thumb.setPointerCapture(e.pointerId);
    thumb.classList.add('is-dragging');
    const startY = e.clientY, startScroll = window.scrollY;
    const ratio = (root.scrollHeight - window.innerHeight) / (window.innerHeight - gap * 2 - thumb.offsetHeight);

    function move(ev) { window.scrollTo(0, startScroll + (ev.clientY - startY) * ratio); }
    function end() {
      thumb.classList.remove('is-dragging');
      thumb.removeEventListener('pointermove', move);
      thumb.removeEventListener('pointerup', end);
      thumb.removeEventListener('pointercancel', end);
    }
    thumb.addEventListener('pointermove', move);
    thumb.addEventListener('pointerup', end);
    thumb.addEventListener('pointercancel', end);
  });

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  new ResizeObserver(update).observe(document.body);
  update();
})();
