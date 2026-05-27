(function () {
  const targets = document.querySelectorAll('[data-project-ids]');
  if (!targets.length || !window.siteProjects || !window.siteProjects.length) return;

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
    const selectedIds = target.dataset.projectIds
      .split(',')
      .map(id => id.trim())
      .filter(Boolean)
      .slice(0, 2);

    const selectedProjects = selectedIds
      .map(id => window.siteProjects.find(project => project.id === id))
      .filter(Boolean);

    target.innerHTML = selectedProjects.map(project => {
      const href = project.href[language] || project.href.en;
      const isEnglishOnly = language === 'de' && href.startsWith('en/');
      const contentLanguage = isEnglishOnly ? 'en' : language;
      const title = project.title[contentLanguage] || project.title.en;
      const summary = project.summary[contentLanguage] || project.summary.en;
      const note = isEnglishOnly ? '<span class="post-language-note">English only</span>' : '';
      const linkLabel = language === 'de' ? 'Projekt ansehen' : 'View project';

      return `
        <a class="card card-link" href="${href}" data-preview-source="summary">
          <h3>${title}</h3>
          <p></p>
          <div class="card-meta">
            ${note}
            ${note ? '<span>·</span>' : ''}
            <span class="post-link">${linkLabel} →</span>
          </div>
          ${renderTags(project.tags)}
        </a>
      `;
    }).join('');
  });
})();
