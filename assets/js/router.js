document.addEventListener('DOMContentLoaded', () => {
  // Resolve the depth from current page back to site root so we can
  // build an absolute-looking path regardless of subdirectory hosting.
  function toRootRelative(href) {
    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return null; // external
      return url.pathname; // e.g. /pages/en/posts/starting/
    } catch {
      return null;
    }
  }

  function canonicalPath(pathname) {
    let path = pathname || '/';
    if (!path.startsWith('/')) path = `/${path}`;
    path = path.replace(/\/index\.html$/i, '/');
    if (path !== '/404.html' && path.endsWith('.html')) {
      path = `${path.slice(0, -'.html'.length)}/`;
    }
    return path;
  }

  function documentBasePath() {
    const base = document.querySelector('base[href]');
    if (!base) return null;

    try {
      const url = new URL(base.getAttribute('href'), window.location.href);
      if (url.origin !== window.location.origin) return null;
      return url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
    } catch {
      return null;
    }
  }

  // Build a lookup of every valid pathname as it would appear in window.location.pathname.
  // Works for both root hosting (marvin.github.io) and subdirectory hosting (…/webpage/).
  function buildValidSet() {
    const base = (() => {
      // Walk up from the current path until we find the segment that precedes
      // the first known valid-path segment, giving us the site's base prefix.
      const parts = window.location.pathname.split('/');
      const current = canonicalPath(window.location.pathname);
      const discoveryPaths = VALID_PATHS.filter(p => p && p !== 'index.html');
      for (let i = parts.length - 1; i >= 0; i--) {
        const candidate = parts.slice(0, i).join('/') + '/';
        if (discoveryPaths.some(p => canonicalPath(candidate + p) === current)) {
          return candidate;
        }
      }
      return documentBasePath() || '/';
    })();

    return new Set(VALID_PATHS.map(p => canonicalPath(base + p)));
  }

  const validSet = buildValidSet();
  const currentPath = canonicalPath(window.location.pathname);
  const currentPathWithSlash = currentPath.endsWith('/') ? currentPath : `${currentPath}/`;
  if (currentPath !== window.location.pathname && validSet.has(currentPath)) {
    window.location.replace(currentPath + window.location.search + window.location.hash);
    return;
  }
  if (currentPathWithSlash !== window.location.pathname && validSet.has(currentPathWithSlash) && !/\.[^/]+$/.test(currentPath)) {
    window.location.replace(currentPathWithSlash + window.location.search + window.location.hash);
    return;
  }

  document.querySelectorAll('a[href]').forEach(link => {
    if (link.hasAttribute('download')) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    const pathname = toRootRelative(link.href);
    if (pathname === null) return; // skip external links

    // Strip query / hash for comparison
    const clean = canonicalPath(pathname.split('?')[0].split('#')[0]);

    // Root path aliases
    if (clean === '/' || clean === '') return;

    const cleanWithSlash = clean.endsWith('/') ? clean : `${clean}/`;
    if (!validSet.has(clean) && !validSet.has(cleanWithSlash)) {
      link.addEventListener('click', e => {
        e.preventDefault();
        // Navigate to 404 — works for both root and subdirectory hosting
        const base = (() => {
          const homePath = [...validSet].find(p => p.endsWith('/pages/en/home/'));
          return homePath ? homePath.replace('pages/en/home/', '') : '/';
        })();
        window.location.href = base + '404.html';
      });
    }
  });
});
