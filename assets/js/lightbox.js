(function () {
  var OPEN_DURATION = 320;

  var overlay = null;
  var clone = null;
  var sourceImg = null;
  var closing = false;

  function targetRect(naturalW, naturalH, startRect) {
    var maxW = window.innerWidth * 0.9;
    var maxH = window.innerHeight * 0.9;
    var baseW = naturalW || startRect.width * 3;
    var baseH = naturalH || startRect.height * 3;

    var scale = Math.min(maxW / baseW, maxH / baseH);
    if (!isFinite(scale) || scale <= 0) scale = 1;

    var finalW = baseW * scale;
    var finalH = baseH * scale;
    return {
      width: finalW,
      height: finalH,
      top: (window.innerHeight - finalH) / 2,
      left: (window.innerWidth - finalW) / 2
    };
  }

  function openLightbox(img) {
    if (overlay) return;
    closing = false;
    sourceImg = img;

    var startRect = img.getBoundingClientRect();

    overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeLightbox();
    });

    clone = document.createElement('img');
    clone.src = img.currentSrc || img.src;
    clone.className = 'lightbox-img';
    clone.style.top = startRect.top + 'px';
    clone.style.left = startRect.left + 'px';
    clone.style.width = startRect.width + 'px';
    clone.style.height = startRect.height + 'px';
    clone.addEventListener('click', closeLightbox);

    overlay.appendChild(clone);
    document.body.appendChild(overlay);
    document.body.classList.add('lightbox-lock');
    sourceImg.classList.add('lightbox-source-hidden');

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add('is-visible');
        var end = targetRect(img.naturalWidth, img.naturalHeight, startRect);
        clone.style.top = end.top + 'px';
        clone.style.left = end.left + 'px';
        clone.style.width = end.width + 'px';
        clone.style.height = end.height + 'px';
      });
    });

    document.addEventListener('keydown', onKeydown);
  }

  function closeLightbox() {
    if (!overlay || closing) return;
    closing = true;

    var endRect = sourceImg.getBoundingClientRect();
    overlay.classList.remove('is-visible');
    clone.style.top = endRect.top + 'px';
    clone.style.left = endRect.left + 'px';
    clone.style.width = endRect.width + 'px';
    clone.style.height = endRect.height + 'px';

    var cleaned = false;
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (sourceImg) sourceImg.classList.remove('lightbox-source-hidden');
      document.body.classList.remove('lightbox-lock');
      document.removeEventListener('keydown', onKeydown);
      overlay = null;
      clone = null;
      sourceImg = null;
      closing = false;
    }

    clone.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, OPEN_DURATION + 100);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') closeLightbox();
  }

  document.addEventListener('click', function (e) {
    var img = e.target.closest && e.target.closest('.post-body img');
    if (!img || img.classList.contains('lightbox-source-hidden')) return;
    openLightbox(img);
  });
})();
