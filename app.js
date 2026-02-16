(() => {
  const root = document.documentElement;

  const THEME_KEY = 'cc_theme';
  const LEGACY_ARC_KEY = 'cc_style_arc';
  const THEME_MANIFEST_URL = 'themes/themes.json';
  const themeSelect = document.getElementById('themeSelect');
  const themeHint = document.getElementById('themeHint');

  const defaultThemeCatalog = [
    {
      id: 'default',
      label: 'Default',
      css: 'themes/default.css',
      description: 'Current site look',
    },
    {
      id: 'arc',
      label: 'Arc',
      css: 'themes/arc.css',
      description: 'Neon tunnel motion theme',
    },
  ];

  let themeCatalog = [...defaultThemeCatalog];
  let allowedThemes = new Set(themeCatalog.map((theme) => theme.id));
  let themesById = new Map(themeCatalog.map((theme) => [theme.id, theme]));

  const sanitizeThemeId = (value) => {
    const stringValue = String(value || '').toLowerCase();
    return /^[a-z0-9-]+$/.test(stringValue) ? stringValue : 'default';
  };

  const normalizeTheme = (value) => {
    const candidate = sanitizeThemeId(value);
    return allowedThemes.has(candidate) ? candidate : 'default';
  };

  const getStoredTheme = () => {
    try {
      const explicit = localStorage.getItem(THEME_KEY);
      if (explicit && allowedThemes.has(explicit)) return explicit;

      // Migration path for existing users.
      if (localStorage.getItem(LEGACY_ARC_KEY) === 'true' && allowedThemes.has('arc')) return 'arc';
    } catch (e) {}

    return 'default';
  };

  const ensureThemeStylesheet = () => {
    let link = document.getElementById('themeStylesheet');
    if (link instanceof HTMLLinkElement) return link;

    link = document.createElement('link');
    link.id = 'themeStylesheet';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return link;
  };

  const applyThemeStylesheet = (themeId) => {
    const theme = themesById.get(themeId) || themesById.get('default');
    if (!theme?.css) return;

    const link = ensureThemeStylesheet();
    if (link.getAttribute('href') !== theme.css) {
      link.setAttribute('href', theme.css);
    }
  };

  const renderThemeOptions = (activeTheme) => {
    if (!themeSelect) return;

    themeSelect.innerHTML = '';
    themeCatalog.forEach((theme) => {
      const option = document.createElement('option');
      option.value = theme.id;
      option.textContent = theme.label;
      if (theme.description) option.title = theme.description;
      themeSelect.appendChild(option);
    });

    themeSelect.value = normalizeTheme(activeTheme);
  };

  const setThemeHint = (themeId) => {
    if (!themeHint) return;
    const description = themesById.get(themeId)?.description;
    themeHint.textContent = description || 'Switch visual style instantly.';
  };

  const applyTheme = (theme) => {
    const nextTheme = normalizeTheme(theme);

    if (nextTheme === 'default') {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = nextTheme;
    }

    applyThemeStylesheet(nextTheme);
    renderThemeOptions(nextTheme);
    setThemeHint(nextTheme);

    try {
      localStorage.setItem(THEME_KEY, nextTheme);
      localStorage.setItem(LEGACY_ARC_KEY, nextTheme === 'arc' ? 'true' : 'false');
    } catch (e) {}
  };

  const hydrateThemeCatalog = async () => {
    try {
      const response = await fetch(THEME_MANIFEST_URL, { cache: 'no-store' });
      if (!response.ok) return;

      const payload = await response.json();
      const themes = Array.isArray(payload?.themes) ? payload.themes : [];

      const validated = themes
        .map((theme) => ({
          id: sanitizeThemeId(theme?.id),
          label: String(theme?.label || '').trim(),
          css: String(theme?.css || '').trim(),
          description: String(theme?.description || '').trim(),
        }))
        .filter((theme) => theme.id && theme.label && theme.css);

      if (!validated.length) return;

      themeCatalog = validated;
      allowedThemes = new Set(validated.map((theme) => theme.id));
      themesById = new Map(validated.map((theme) => [theme.id, theme]));
    } catch (e) {
      // Fallback to baked-in catalog
    }
  };

  const firstTheme = normalizeTheme(root.dataset.theme || getStoredTheme());
  applyTheme(firstTheme);

  if (themeSelect) {
    themeSelect.addEventListener('change', (event) => {
      applyTheme(event.target.value);
    });
  }

  hydrateThemeCatalog().then(() => {
    const nextTheme = normalizeTheme(root.dataset.theme || getStoredTheme());
    applyTheme(nextTheme);
  });

  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  const updatedEl = document.getElementById('updated');
  if (updatedEl) {
    const parsedModified = Date.parse(document.lastModified || '');
    const modifiedDate = Number.isFinite(parsedModified) ? new Date(parsedModified) : new Date();

    updatedEl.textContent = modifiedDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
    updatedEl.title = modifiedDate.toISOString();
  }

  // Marquee: keep the HTML source clean (single set of tiles), but duplicate it at runtime
  // so the CSS animation (translateX(-50%)) loops seamlessly.
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const track = document.querySelector('.hero-marquee__track');
    if (track && track.dataset.cloned !== 'true') {
      const children = Array.from(track.children);
      children.forEach((node) => {
        const clone = node.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        if (clone instanceof HTMLElement) {
          clone.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach((el) => {
            if (el instanceof HTMLElement) el.tabIndex = -1;
          });
        }
        track.appendChild(clone);
      });
      track.dataset.cloned = 'true';
    }
  }

  // Subtle standard-theme background drift on scroll
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let ticking = false;
    const applyBackgroundDrift = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      const useDrift = (root.dataset.theme || 'default') !== 'arc';
      root.style.setProperty('--bg-shift-a', `${useDrift ? Math.round(y * 0.03) : 0}px`);
      root.style.setProperty('--bg-shift-b', `${useDrift ? Math.round(y * -0.02) : 0}px`);
      root.style.setProperty('--bg-shift-c', `${useDrift ? Math.round(y * 0.015) : 0}px`);
      ticking = false;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(applyBackgroundDrift);
      },
      { passive: true }
    );

    applyBackgroundDrift();
  }

  // Reveal-on-scroll
  const revealNodes = Array.from(document.querySelectorAll('[data-reveal]'));
  revealNodes.forEach((node) => {
    const delay = Number(node.dataset.delay || 0);
    node.style.setProperty('--reveal-delay', `${delay}ms`);
  });

  if (!revealNodes.length) return;

  if (!('IntersectionObserver' in window)) {
    revealNodes.forEach((node) => node.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.1,
    }
  );

  revealNodes.forEach((node) => io.observe(node));
})();
