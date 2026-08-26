(function () {
  function cleanSegments(pathname) {
    return pathname
      .replace(/\/index\.html$/i, '/')
      .split('/')
      .filter(Boolean);
  }

  function sectionFromPathname(pathname) {
    const parts = cleanSegments(pathname);
    const pagesIndex = parts.lastIndexOf('pages');
    if (pagesIndex >= 0) return parts[pagesIndex + 2] || 'home';
    return parts.length ? parts[parts.length - 1].replace(/\.html$/i, '') : 'home';
  }

  /* Highlight the active nav link based on the current section */
  const section = sectionFromPathname(location.pathname);

  /* Letter + icon entrance animation only on the home page */
  const isHome = section === 'home';
  const navLink = document.querySelector('.nav-name');
  const letters = document.querySelectorAll('.nav-name .letter');
  const iconStage = document.querySelector('.nav-name .icon-stage');

  if (!isHome) {
    letters.forEach(el => {
      el.style.animation = 'none';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
    // iconStage already renders in its resting (apart) state by default — no JS needed.
  } else if (iconStage) {
    // Play the card-split entrance once on load, same as the letters do via CSS.
    iconStage.dataset.state = 'stacked';
    requestAnimationFrame(() => {
      iconStage.dataset.state = 'apart';
    });
  }

  document.querySelectorAll('.nav-links a').forEach(a => {
    try {
      const hrefSection = sectionFromPathname(new URL(a.getAttribute('href'), location.href).pathname);
      if (hrefSection === section) a.classList.add('active');
    } catch (e) {}
  });

  /* Clicking the icon while already on the home page replays the letter-swing
     and card-split animations instead of reloading. */
  if (isHome && navLink && letters.length) {
    navLink.addEventListener('click', e => {
      e.preventDefault();
      letters.forEach(el => {
        el.style.animationName = 'none'; // longhand only, so inline animation-delay (the per-letter stagger) survives
      });
      if (iconStage) iconStage.dataset.state = 'stacked';
      void navLink.offsetWidth; // reflow, so the restart below actually replays
      letters.forEach(el => {
        el.style.animationName = 'letterSwing';
      });
      if (iconStage) iconStage.dataset.state = 'apart';
    });
  }

  /* Mobile hamburger toggle */
  const toggle = document.querySelector('.nav-toggle');
  const links  = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => links.classList.remove('open'))
    );
  }

  /* Hide nav while scrolling down, reveal while scrolling up */
  const nav = document.querySelector('nav');
  let lastScrollY = window.scrollY;
  let ticking = false;

  function updateNavVisibility() {
    if (!nav) return;
    const currentY = window.scrollY;
    const isMenuOpen = links && links.classList.contains('open');

    if (currentY <= 20 || isMenuOpen) {
      nav.classList.remove('nav-hidden');
    } else if (currentY > lastScrollY + 8) {
      nav.classList.add('nav-hidden');
    } else if (currentY < lastScrollY - 8) {
      nav.classList.remove('nav-hidden');
    }

    lastScrollY = Math.max(currentY, 0);
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateNavVisibility);
      ticking = true;
    }
  }, { passive: true });

  /*
   * Accent colour toggle parked for now.
   * var accentBtn = document.querySelector('nav .accent-toggle');
   * if (accentBtn) accentBtn.addEventListener('click', function () {
   *   var html = document.documentElement;
   *   var next = html.dataset.accent === 'green' ? '' : 'green';
   *   if (next) { html.dataset.accent = next; } else { delete html.dataset.accent; }
   *   try { localStorage.setItem('accent', next); } catch(e) {}
   * });
   */

  /* Compute site root path (used for footer and dynamic script loading) */
  const parts = cleanSegments(location.pathname);
  const pagesIndex = parts.lastIndexOf('pages');
  const root = pagesIndex >= 0 ? '../'.repeat(parts.length - pagesIndex) : '';

  /* Load bookmark module */
  (function () {
    const s = document.createElement('script');
    s.src = root + 'assets/cache/bookmarks.js';
    document.body.appendChild(s);
  })();

  /* Inject shared footer */
  const footer = document.querySelector('footer');
  if (footer) {
    const home = 'pages/en/home/';
    const footerLabel = 'Built by';
    const updatedLabel = 'Last updated: August 24, 2026';
    const licenseLabel = 'Licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> — attribution required';
    footer.innerHTML = `
      <span class="last-updated">${updatedLabel}</span>
      <p>${footerLabel} <a href="${root}${home}">Marvin Gülhan</a></p>
      <div class="socials">
        <a href="https://www.linkedin.com/in/marvin-g%C3%BClhan-b1912v1909b09/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
          <svg class="social-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.3 8h4.4v15H.3V8Zm7.2 0h4.2v2.05h.06c.58-1.1 2-2.26 4.12-2.26 4.4 0 5.22 2.9 5.22 6.68V23h-4.4v-7.56c0-1.8-.03-4.12-2.5-4.12-2.52 0-2.9 1.97-2.9 4V23H7.5V8Z"/>
          </svg>
        </a>
        <a href="https://github.com/Marff16" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
          <svg class="social-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.16c-3.2.7-3.88-1.36-3.88-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.73-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0C17.04 4.95 18 5.26 18 5.26c.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.16c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/>
          </svg>
        </a>
        <a href="https://scholar.google.de/citations?user=4oK7aQwAAAAJ&hl=en" target="_blank" rel="noopener noreferrer" aria-label="Google Scholar">
          <svg class="social-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
          </svg>
        </a>
        <a href="mailto:marvin.guelhan@proton.me" aria-label="Email">
          <svg class="social-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457Z"/>
          </svg>
        </a>
      </div>
      <p class="footer-license">${licenseLabel}</p>`;
  }
})();
