(function () {
  var STORAGE_KEY = 'siteBookmarks';
  var MAX = 3;

  /* ── Storage ── */
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }

  function save(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
    catch (e) {}
  }

  /* ── Current page info ── */
  function currentPage() {
    var rawTitle = document.title || '';
    var title = rawTitle.includes('·') ? rawTitle.split('·')[0].trim() : rawTitle;

    var pathParts = location.pathname
      .replace(/\/index\.html$/i, '/')
      .split('/')
      .filter(Boolean);
    var displayParts = pathParts.filter(function (p) {
      return p !== 'pages' && p !== 'en' && p !== 'de' && p !== 'index.html';
    });
    var path;
    if (!displayParts.length || displayParts[displayParts.length - 1] === 'home') {
      path = 'Home';
    } else {
      path = displayParts
        .map(function (p) { return p.replace('.html', '').replace(/-/g, ' '); })
        .join(' › ');
    }

    return { title: title, url: location.href, path: path };
  }

  /* ── Bookmark actions ── */
  function isBookmarked(url) {
    return load().some(function (b) { return b.url === url; });
  }

  function addBookmark() {
    var page = currentPage();
    var list = load().filter(function (b) { return b.url !== page.url; });
    list.push(page);
    if (list.length > MAX) list = list.slice(list.length - MAX);
    save(list);
  }

  function removeBookmark(url) {
    save(load().filter(function (b) { return b.url !== url; }));
  }

  /* ── Helpers ── */
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── UI ── */
  var btn, dropdown;

  function renderDropdown() {
    if (!dropdown) return;
    var list = load();
    var isLang = document.documentElement.lang === 'de';
    var alreadySaved = isBookmarked(location.href);

    /* Items (newest first) */
    var itemsHtml = '';
    if (!list.length) {
      itemsHtml = '<div class="bookmark-empty">' + (isLang ? 'Keine Lesezeichen.' : 'No bookmarks yet.') + '</div>';
    } else {
      list.slice().reverse().forEach(function (b) {
        itemsHtml += '<div class="bookmark-item" data-url="' + esc(b.url) + '">' +
          '<span class="bookmark-item-title">' + esc(b.title) + '</span>' +
          '<span class="bookmark-item-path">' + esc(b.path) + '</span>' +
          '<span class="bookmark-item-go">' + (isLang ? 'Gehe dorthin →' : 'Go back →') + '</span>' +
          '<button class="bookmark-delete" data-url="' + esc(b.url) + '" aria-label="' + (isLang ? 'Entfernen' : 'Remove') + '">&times;</button>' +
          '</div>';
      });
    }

    var addLabel  = alreadySaved ? (isLang ? '✓ Gespeichert' : '✓ Saved') : (isLang ? 'Lesezeichen hinzufügen' : 'Add bookmark');
    var hintLabel = isLang ? 'Bis zu 3 Lesezeichen' : 'Up to 3 bookmarks';
    var headLabel = isLang ? 'Lesezeichen' : 'Bookmarks';

    dropdown.innerHTML =
      '<div class="bookmark-dropdown-header">' + headLabel + '</div>' +
      itemsHtml +
      '<div class="bookmark-footer">' +
        '<span class="bookmark-hint">' + hintLabel + '</span>' +
        '<button class="bookmark-add-btn"' + (alreadySaved ? ' disabled' : '') + '>' + addLabel + '</button>' +
      '</div>';

    /* Delete buttons */
    dropdown.querySelectorAll('.bookmark-delete').forEach(function (del) {
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        removeBookmark(del.dataset.url);
        renderDropdown();
        updateBtnState();
      });
    });

    /* Item click → navigate */
    dropdown.querySelectorAll('.bookmark-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        if (e.target.closest('.bookmark-delete')) return;
        location.href = item.dataset.url;
      });
    });

    /* Add bookmark */
    var addBtn = dropdown.querySelector('.bookmark-add-btn');
    if (addBtn && !addBtn.disabled) {
      addBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        addBookmark();
        renderDropdown();
        updateBtnState();
      });
    }
  }

  function updateBtnState() {
    if (!btn) return;
    btn.classList.toggle('bookmarked', isBookmarked(location.href));
  }

  function openDropdown() {
    renderDropdown();
    dropdown.hidden = false;
    btn.classList.add('open');
  }

  function closeDropdown() {
    dropdown.hidden = true;
    btn.classList.remove('open');
  }

  function toggleDropdown() {
    if (dropdown.hidden) openDropdown(); else closeDropdown();
  }

  /* ── Inject into nav ── */
  function inject() {
    var navRight = document.querySelector('.nav-right');
    var navLinks = navRight && navRight.querySelector('.nav-links');
    if (!navRight || !navLinks) return;

    /* Wrapper: sits just before the nav-links list inside .nav-right */
    var wrapper = document.createElement('div');
    wrapper.className = 'bookmark-wrap';

    /* Bookmark toggle button */
    btn = document.createElement('button');
    btn.className = 'bookmark-btn';
    btn.setAttribute('aria-label', 'Bookmarks');
    btn.innerHTML =
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>' +
      '</svg>';

    /* Dropdown panel */
    dropdown = document.createElement('div');
    dropdown.className = 'bookmark-dropdown';
    dropdown.hidden = true;

    wrapper.appendChild(btn);
    wrapper.appendChild(dropdown);

    /* Insert the wrapper directly before the nav-links ul */
    navRight.insertBefore(wrapper, navLinks);

    updateBtnState();

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleDropdown();
    });

    document.addEventListener('click', function (e) {
      if (!wrapper.contains(e.target)) closeDropdown();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
