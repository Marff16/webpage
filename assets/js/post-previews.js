(function () {
  var cards = document.querySelectorAll('.card-link[href]');
  if (!cards.length) return;

  function getText(el) {
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function trimToWord(text, max) {
    if (text.length <= max) return text;
    return text.slice(0, max).replace(/\s+\S*$/, '');
  }

  /* Renders text as per-word spans that fade out over the final stretch of
     words, so a trimmed preview trails off instead of stopping abruptly. */
  function renderFadingText(el, text) {
    el.textContent = '';
    var words = text.split(' ');
    var fadeCount = Math.min(words.length, 8);
    var fadeStart = words.length - fadeCount;

    words.forEach(function (word, i) {
      var span = document.createElement('span');
      span.textContent = word;
      if (i >= fadeStart) {
        var progress = (i - fadeStart + 1) / fadeCount;
        span.style.opacity = Math.max(0.15, 1 - progress * 0.85);
      }
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }

  cards.forEach(function (card) {
    var href = card.getAttribute('href');
    if (!href) return;

    var url;
    try { url = new URL(href, window.location.href).href; } catch (e) { return; }

    var useSummary = card.dataset.previewSource === 'summary';

    fetch(url)
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');

        if (useSummary) {
          var summary = doc.querySelector('.post-header .post-summary');
          var textEl = card.querySelector('p');
          if (summary && textEl) {
            textEl.textContent = trimToWord(getText(summary), 150);
          }
        } else {
          var body = doc.querySelector('.post-body');
          if (!body) return;

          var previewEl = card.querySelector('.post-preview p');
          if (previewEl) {
            renderFadingText(previewEl, trimToWord(getText(body), 200));
          }

          var articleMeta = doc.querySelector('.post-header .card-meta');
          var cardMeta = card.querySelector('.card-meta');
          if (articleMeta && cardMeta) {
            var readLink = cardMeta.querySelector('.post-link');
            cardMeta.innerHTML = '';
            articleMeta.querySelectorAll('span').forEach(function (s) {
              cardMeta.appendChild(s.cloneNode(true));
            });
            if (readLink) {
              var dot = document.createElement('span');
              dot.textContent = '·';
              cardMeta.appendChild(dot);
              cardMeta.appendChild(readLink);
            }
          }
        }

        var articleTags = doc.querySelector('.post-header .tags');
        var cardTags = card.querySelector('.tags');
        if (articleTags && cardTags) {
          cardTags.innerHTML = articleTags.innerHTML;
        }
      })
      .catch(function () {});
  });
})();
