(function () {
  const targets = document.querySelectorAll('[data-latest-post]');
  if (!targets.length || !window.sitePosts || !window.sitePosts.length) return;

  const latestPost = [...window.sitePosts].sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  function formatDate(date, language) {
    const locale = language === 'de' ? 'de-DE' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(`${date}T00:00:00`));
  }

  function renderTags(tags) {
    if (!tags || !tags.length) return '';
    return `
      <div class="tags">
        ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
    `;
  }

  targets.forEach(target => {
    const language = target.dataset.language || document.documentElement.lang || 'en';
    const isEnglishOnly = language === 'de' && latestPost.language === 'en';
    const readLabel = language === 'de' ? 'Beitrag lesen' : 'Read post';
    const note = isEnglishOnly ? '<span class="post-language-note">English only</span><span>·</span>' : '';

    target.innerHTML = `
      <a class="card card-link" href="${latestPost.href}">
        <h3>${latestPost.title}</h3>
        <p>${latestPost.summary}</p>
        <div class="card-meta">
          ${note}
          <span>${formatDate(latestPost.date, language)}</span>
          <span>·</span>
          <span>${latestPost.readTime}</span>
          <span>·</span>
          <span class="post-link">${readLabel} →</span>
        </div>
        ${renderTags(latestPost.tags)}
      </a>
    `;
  });
})();
