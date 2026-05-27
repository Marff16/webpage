document.addEventListener('DOMContentLoaded', () => {
  // Resolve the depth from current page back to site root so we can
  // build an absolute-looking path regardless of subdirectory hosting.
  function toRootRelative(href) {
    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return null; // external
      return url.pathname; // e.g. /pages/en/posts/starting.html
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
      for (let i = parts.length - 1; i >= 0; i--) {
        const candidate = parts.slice(0, i).join('/') + '/';
        if (VALID_PATHS.some(p => (candidate + p) === window.location.pathname)) {
          return candidate;
        }
      }
      return '/';
    })();

    return new Set(VALID_PATHS.map(p => base + p));
  }

  const validSet = buildValidSet();

  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    const pathname = toRootRelative(href);
    if (pathname === null) return; // skip external links

    // Strip query / hash for comparison
    const clean = pathname.split('?')[0].split('#')[0];

    // Root path aliases
    if (clean === '/' || clean === '') return;

    if (!validSet.has(clean)) {
      link.addEventListener('click', e => {
        e.preventDefault();
        // Navigate to 404 — works for both root and subdirectory hosting
        const base = validSet.size > 0
          ? [...validSet][0].replace(VALID_PATHS[0], '')
          : '/';
        window.location.href = base + '404.html';
      });
    }
  });
});
