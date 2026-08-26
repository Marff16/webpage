(function () {
  const targets = document.querySelectorAll('[data-latest-post]');
  if (!targets.length || !window.sitePosts || !window.sitePosts.length) return;

  const latestPost = [...window.sitePosts].sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  function siteRoot() {
    const parts = window.location.pathname
      .replace(/\/index\.html$/i, '/')
      .split('/')
      .filter(Boolean);
    const pagesIndex = parts.lastIndexOf('pages');
    return pagesIndex >= 0 ? '../'.repeat(parts.length - pagesIndex) : '';
  }

  function resolveSiteHref(href) {
    if (!href || href.startsWith('#') || href.startsWith('/') || href.startsWith('//') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) {
      return href;
    }
    return siteRoot() + href;
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
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
    const href = resolveSiteHref(latestPost.href);

    target.innerHTML = `
      <a class="card card-link" href="${href}">
        <h3>${latestPost.title}</h3>
        <p>${latestPost.summary}</p>
        <div class="card-meta">
          <span>${formatDate(latestPost.date)}</span>
          <span>·</span>
          <span>${latestPost.readTime}</span>
          <span>·</span>
          <span class="post-link">Read post →</span>
        </div>
        ${renderTags(latestPost.tags)}
      </a>
    `;
  });
})();
