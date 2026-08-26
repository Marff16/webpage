(function () {
  const targets = document.querySelectorAll('[data-project-ids]');
  if (!targets.length || !window.siteProjects || !window.siteProjects.length) return;

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

  function renderTags(tags) {
    if (!tags || !tags.length) return '';
    return `
      <div class="tags">
        ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
    `;
  }

  targets.forEach(target => {
    const selectedIds = target.dataset.projectIds
      .split(',')
      .map(id => id.trim())
      .filter(Boolean)
      .slice(0, 2);

    const selectedProjects = selectedIds
      .map(id => window.siteProjects.find(project => project.id === id))
      .filter(Boolean);

    target.innerHTML = selectedProjects.map(project => {
      const href = resolveSiteHref(project.href);

      return `
        <a class="card card-link" href="${href}" data-preview-source="summary">
          <h3>${project.title}</h3>
          <p></p>
          <div class="card-meta">
            <span class="post-link">View project →</span>
          </div>
          ${renderTags(project.tags)}
        </a>
      `;
    }).join('');
  });
})();
