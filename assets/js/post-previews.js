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
            previewEl.textContent = trimToWord(getText(body), 300);
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
