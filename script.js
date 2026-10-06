/* ==========================================================================
   SAB Digital Solutions — script.js  (vanilla JS, no dependencies)
   --------------------------------------------------------------------------
   1. Config & helpers       5. Scroll reveal
   2. Language / RTL         6. Parallax, hero tilt, cursor label
   3. Header & menu          7. Demo modal (video lightbox)
   4. Scroll-spy             8. Init
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- 1. Config & helpers ---------- */
  const SUPPORTED_LANGS = ['en', 'ar'];   // add a code here + a block in translations.js to add a language
  const DEFAULT_LANG = 'en';
  const STORAGE_KEY = 'sab-lang';

  const dict = window.SAB_I18N || {};
  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const pad = (n) => String(n).padStart(2, '0');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  let lang = DEFAULT_LANG;
  let menuOpen = false;

  /* ---------- 2. Language / RTL ---------- */
  const lookup = (l, key) =>
    key.split('.').reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : undefined), dict[l]);

  /** Translate a key in the current language (falls back to English, then to the key itself). */
  const t = (key) => {
    const v = lookup(lang, key);
    if (v !== undefined) return v;
    const fallback = lookup(DEFAULT_LANG, key);
    return fallback !== undefined ? fallback : key;
  };

  /** Split a heading into masked word spans so each word can rise into place. */
  function splitWords(el, text) {
    const words = text.trim().split(/\s+/);
    el.textContent = '';
    el.setAttribute('aria-label', text);
    words.forEach((word, i) => {
      const mask = document.createElement('span');
      mask.className = 'w';
      mask.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      inner.className = 'w__i';
      inner.style.setProperty('--i', i);
      inner.textContent = word;
      mask.appendChild(inner);
      el.appendChild(mask);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }

  function applyLanguage(next, { persist = true } = {}) {
    if (!SUPPORTED_LANGS.includes(next) || !dict[next]) next = DEFAULT_LANG;
    lang = next;

    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';

    document.title = t('meta.title');
    const metaDesc = $('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', t('meta.description'));

    $$('[data-i18n]').forEach((el) => {
      const value = t(el.dataset.i18n);
      if (el.hasAttribute('data-split')) splitWords(el, value);
      else el.textContent = value;
    });

    // data-i18n-attr="alt:some.key;aria-label:other.key"
    $$('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').forEach((pair) => {
        const idx = pair.indexOf(':');
        if (idx < 1) return;
        el.setAttribute(pair.slice(0, idx).trim(), t(pair.slice(idx + 1).trim()));
      });
    });

    // Accessible names that combine two strings
    $$('.device-btn[data-open]').forEach((btn) => {
      btn.setAttribute('aria-label', `${t('work.openDemo')} ${t(`projects.${btn.dataset.open}.name`)}`);
    });
    $$('.demo-link[data-open]').forEach((btn) => {
      btn.setAttribute('aria-label', `${t('work.viewDemo')}: ${t(`projects.${btn.dataset.open}.name`)}`);
    });

    // "Read More" buttons carry their own toggle state, so re-apply the correct
    // label (Read More / Read Less) instead of letting the generic data-i18n pass reset it.
    $$('.case__readmore').forEach((btn) => {
      const label = $('.case__readmore-label', btn);
      if (!label) return;
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      label.textContent = t(isOpen ? 'work.readLess' : 'work.readMore');
    });

    $$('[data-lang]').forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang)));
    updateMenuLabel();

    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* storage unavailable — ignore */ }
    }
    if (modalState.open) renderModalText();
    requestParallax();
  }

  function getSavedLanguage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED_LANGS.includes(saved)) return saved;
    } catch (e) { /* ignore */ }
    return DEFAULT_LANG;
  }

  /* ---------- 3. Header & mobile menu ---------- */
  const header = $('#header');
  const burger = $('#burger');
  const nav = $('#nav');

  function updateHeader() {
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  }

  function updateMenuLabel() {
    burger.setAttribute('aria-label', t(menuOpen ? 'a11y.closeMenu' : 'a11y.menu'));
  }

  function setMenu(open) {
    menuOpen = open;
    nav.classList.toggle('is-open', open);
    header.classList.toggle('is-menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    if (!modalState.open) root.classList.toggle('is-locked', open);
    updateMenuLabel();
  }

  /* ---------- 4. Scroll-spy ---------- */
  function initScrollSpy() {
    const ids = ['home', 'about', 'services', 'work', 'process', 'contact'];
    const links = $$('[data-nav]');
    const setActive = (id) => links.forEach((a) => {
      if (a.dataset.nav === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    if (!('IntersectionObserver' in window)) return;
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* ---------- 5. Scroll reveal ---------- */
  function initReveal() {
    const targets = $$('.reveal, .split, .rule, .step');
    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((el) => io.observe(el));
  }

  /* ---------- 6. Parallax, hero tilt, cursor label ---------- */
  const parallaxEls = $$('[data-parallax]');
  let parallaxQueued = false;

  function updateParallax() {
    parallaxQueued = false;
    if (reducedMotion.matches) return;
    const vh = window.innerHeight;
    parallaxEls.forEach((el) => {
      const host = el.parentElement.getBoundingClientRect();   // parent isn't transformed → stable measurement
      if (host.bottom < -300 || host.top > vh + 300) return;
      const offset = host.top + host.height / 2 - vh / 2;
      const y = Math.max(-64, Math.min(64, -offset * parseFloat(el.dataset.parallax)));
      el.style.setProperty('--py', `${y.toFixed(1)}px`);
    });
  }
  function requestParallax() {
    if (parallaxQueued) return;
    parallaxQueued = true;
    requestAnimationFrame(updateParallax);
  }

  function initHeroTilt() {
    const stage = $('.hero__stage');
    if (!stage || !finePointer.matches || reducedMotion.matches) return;
    let queued = false, mx = 0, my = 0;
    const apply = () => {
      queued = false;
      stage.style.setProperty('--mx', mx.toFixed(3));
      stage.style.setProperty('--my', my.toFixed(3));
    };
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!queued) { queued = true; requestAnimationFrame(apply); }
    });
    stage.addEventListener('pointerleave', () => { mx = 0; my = 0; apply(); });
  }

  /** Gold "View Demo" label that follows the pointer over devices (mouse users only). */
  let hideCursor = () => {};
  function initCursor() {
    const cursor = $('#cursor');
    if (!cursor || !finePointer.matches) return;
    root.classList.add('has-cursor');
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, active = false;

    const loop = () => {
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      cursor.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      const settled = Math.abs(tx - x) < 0.3 && Math.abs(ty - y) < 0.3;
      raf = active || !settled ? requestAnimationFrame(loop) : 0;
    };
    hideCursor = () => { active = false; cursor.classList.remove('is-visible'); };

    document.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; });
    document.addEventListener('pointerover', (e) => {
      if (modalState.open || !e.target.closest('[data-cursor]')) return;
      if (!active) { x = tx = e.clientX; y = ty = e.clientY; }
      active = true;
      cursor.classList.add('is-visible');
      if (!raf) raf = requestAnimationFrame(loop);
    });
    document.addEventListener('pointerout', (e) => {
      const from = e.target.closest && e.target.closest('[data-cursor]');
      if (from && !from.contains(e.relatedTarget)) hideCursor();
    });
    window.addEventListener('blur', hideCursor);
  }

  /* ---------- 6b. Project "Read More" ---------- */
  function initReadMore() {
    $$('.case__readmore[data-readmore]').forEach((btn) => {
      const target = document.getElementById(btn.getAttribute('aria-controls'));
      if (!target) return;
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        target.classList.toggle('is-open', open);
        target.setAttribute('aria-hidden', String(!open));
        const label = $('.case__readmore-label', btn);
        if (label) label.textContent = t(open ? 'work.readLess' : 'work.readMore');
      });
    });
  }

  /* ---------- 7. Demo modal ---------- */
  const modal = $('#modal');
  const panel = $('#modal-panel');
  const stage = $('#modal-stage');
  const video = $('#modal-video');
  const modalTitle = $('#modal-title');
  const modalDesc = $('#modal-desc');
  const modalTags = $('#modal-tags');
  const modalCount = $('#modal-count');

  // Projects are read straight from the markup (data-project / data-device / data-video + the <img> src)
  const projects = $$('.case[data-project]').map((el, index) => {
    const img = $('img', el);
    return {
      id: el.dataset.project,
      device: el.dataset.device,
      video: el.dataset.video,
      poster: img ? img.getAttribute('src') : '',
      index
    };
  });
  const projectById = Object.fromEntries(projects.map((p) => [p.id, p]));

  const modalState = { open: false, current: null, lastFocus: null, timer: 0 };

  function renderModalText() {
    const p = modalState.current;
    if (!p) return;
    modalTitle.textContent = t(`projects.${p.id}.name`);
    modalDesc.textContent = t(`projects.${p.id}.longDesc`) || t(`projects.${p.id}.desc`);
    modalCount.textContent = `${pad(p.index + 1)} / ${pad(projects.length)}`;
    modalTags.textContent = '';
    const li = document.createElement('li');
    li.textContent = t(`projects.${p.id}.cat`);
    modalTags.appendChild(li);
  }

  /** Point the player at a project's video. Nothing is downloaded until a project is opened. */
  function loadProject(p) {
    modalState.current = p;
    panel.dataset.device = p.device;
    renderModalText();

    video.pause();
    stage.classList.remove('is-error');
    stage.classList.add('is-loading');
    video.poster = p.poster;
    video.preload = 'metadata';
    video.src = p.video;      // no autoplay — the visitor presses play
    video.load();
  }

  video.addEventListener('loadeddata', () => stage.classList.remove('is-loading'));
  video.addEventListener('error', () => {
    if (!video.getAttribute('src')) return;   // ignore the reset we do when closing
    stage.classList.remove('is-loading');
    stage.classList.add('is-error');
    console.warn(`[SAB] Demo video not found or unsupported: ${video.getAttribute('src')}`);
  });

  function openModal(id, trigger) {
  const project = projectById[id];
  if (!project) return;
  modal.classList.toggle(
  'modal--hero-demo',
  Boolean(trigger?.closest('.hero'))
);

  clearTimeout(modalState.timer);

  modalState.lastFocus = trigger || document.activeElement;
  modalState.open = true;
  hideCursor();

  // Use device-specific settings when provided by the clicked button.
  const p = {
    ...project,
    video: trigger?.dataset.video || project.video,
    device: trigger?.dataset.device || project.device,
    poster: trigger?.dataset.poster || project.poster
  };

  modal.hidden = false;
  root.classList.add('is-locked');

  loadProject(p);

  void modal.offsetWidth;
  modal.classList.add('is-open');
  panel.focus({ preventScroll: true });
}

  function closeModal() {
    if (!modalState.open) return;
    modalState.open = false;
    modal.classList.remove('is-open');
    video.pause();

    modalState.timer = setTimeout(() => {
      modal.hidden = true;
      video.removeAttribute('src');            // stop any buffering
      video.removeAttribute('poster');
      video.load();
      stage.classList.remove('is-loading', 'is-error');
      if (!menuOpen) root.classList.remove('is-locked');
      const back = modalState.lastFocus;
      if (back && typeof back.focus === 'function') back.focus({ preventScroll: true });
    }, reducedMotion.matches ? 0 : 520);
  }

  function stepModal(dir) {
    const { current } = modalState;
    if (!current) return;
    loadProject(projects[(current.index + dir + projects.length) % projects.length]);
  }

  function trapFocus(e) {
    const focusable = $$('button:not([disabled]), [href], video[controls]', panel)
      .filter((el) => !el.closest('[hidden]') && getComputedStyle(el).visibility !== 'hidden');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    else if (!panel.contains(active)) { e.preventDefault(); first.focus(); }
  }

  /* ---------- 8. Init ---------- */
  function bindEvents() {
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-open]');
      if (opener) { e.preventDefault(); openModal(opener.dataset.open, opener); return; }

      if (e.target.closest('[data-close]')) { closeModal(); return; }

      const langBtn = e.target.closest('[data-lang]');
      if (langBtn) { applyLanguage(langBtn.dataset.lang); return; }

      if (menuOpen && e.target.closest('#nav a')) setMenu(false);
    });

    $('#modal-prev').addEventListener('click', () => stepModal(-1));
    $('#modal-next').addEventListener('click', () => stepModal(1));
    burger.addEventListener('click', () => setMenu(!menuOpen));

    document.addEventListener('keydown', (e) => {
      if (modalState.open) {
        if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
        else if (e.key === 'Tab') trapFocus(e);
      } else if (menuOpen && e.key === 'Escape') {
        setMenu(false);
        burger.focus();
      }
    });

    window.addEventListener('scroll', () => { updateHeader(); requestParallax(); }, { passive: true });
    window.addEventListener('resize', () => {
      requestParallax();
      if (menuOpen && window.innerWidth >= 900) setMenu(false);
    });
  }

  function init() {
    applyLanguage(getSavedLanguage(), { persist: false });
    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();

    bindEvents();
    updateHeader();
    initScrollSpy();
    initHeroTilt();
    initCursor();
    initReadMore();
    updateParallax();

    // Start reveals + the hero load-in once fonts are ready (with a safety timeout)
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise((r) => setTimeout(r, 900))]).then(() => {
      initReveal();
      requestAnimationFrame(() => $('.hero').classList.add('is-ready'));
    });
  }

  init();
})();
