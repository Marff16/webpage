(function () {
  var container = document.getElementById('vanta-birds');
  if (!container) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof window.VANTA === 'undefined' || !window.VANTA.BIRDS) return;

  var STORAGE_KEY = 'vanta-birds-seen';

  function hasBeenSeen() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function markAsSeen() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      // localStorage unavailable (e.g. private browsing) — just skip persisting.
    }
  }

  function isReload() {
    try {
      var navEntries = window.performance && performance.getEntriesByType('navigation');
      if (navEntries && navEntries.length > 0) return navEntries[0].type === 'reload';
      if (window.performance && performance.navigation) {
        return performance.navigation.type === performance.navigation.TYPE_RELOAD;
      }
    } catch (e) {}
    return false;
  }

  if (hasBeenSeen() && !isReload()) return;

  function hexToNumber(hex) {
    return parseInt(hex.replace('#', ''), 16);
  }

  var FADE_DELAY_MS = 10000;
  var FADE_DURATION_MS = 1500;

  function init() {
    var styles = getComputedStyle(document.documentElement);
    var accent = styles.getPropertyValue('--accent').trim() || '#b85c38';
    var text = styles.getPropertyValue('--text').trim() || '#28201a';
    var bg = styles.getPropertyValue('--bg').trim() || '#f5f0e8';

    var effect = window.VANTA.BIRDS({
      el: container,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.00,
      minWidth: 200.00,
      scale: 1.00,
      scaleMobile: 1.00,
      backgroundAlpha: 1,
      backgroundColor: hexToNumber(bg),
      color1: hexToNumber(accent),
      color2: hexToNumber(text),
      colorMode: 'varianceGradient',
      birdSize: 1.60,
      wingSpan: 28.00,
      speedLimit: 1.80,
      separation: 34.00,
      alignment: 30.00,
      cohesion: 55.00,
      quantity: 2.00
    });

    container.style.transition = 'opacity ' + FADE_DURATION_MS + 'ms ease';
    markAsSeen();

    setTimeout(function () {
      container.style.opacity = '0';
      setTimeout(function () {
        if (effect && typeof effect.destroy === 'function') effect.destroy();
      }, FADE_DURATION_MS);
    }, FADE_DELAY_MS);
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
