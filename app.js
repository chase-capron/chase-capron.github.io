(() => {
  const root = document.documentElement;

  const THEME_KEY = 'cc_theme';
  const LEGACY_ARC_KEY = 'cc_style_arc';
  const appScript =
    document.querySelector('script[src$="/app.js"]') ||
    document.querySelector('script[src$="app.js"]');
  const appBaseUrl = appScript?.src ? new URL('.', appScript.src).toString() : window.location.href;
  const resolveAssetUrl = (assetPath) => {
    const candidate = String(assetPath || '').trim();
    if (!candidate) return '';

    try {
      return new URL(candidate, appBaseUrl).toString();
    } catch (e) {
      return candidate;
    }
  };
  const THEME_MANIFEST_URL = resolveAssetUrl('themes/themes.json');
  const PROJECT_MANIFEST_URL = resolveAssetUrl('projects/projects.json');
  const themeSelect = document.getElementById('themeSelect');
  const themeHint = document.getElementById('themeHint');
  const themePanelHint = document.getElementById('themePanelHint');
  const themePresetList = document.getElementById('themePresetList');
  const themeManifestStamp = document.getElementById('themeManifestStamp');

  const defaultThemeCatalog = [
    {
      id: 'default',
      label: 'Default',
      css: 'themes/presets/default.css',
      description: 'Current site look',
      accent: '#2f83ff',
      tags: ['Baseline', 'High readability'],
    },
    {
      id: 'arc',
      label: 'Arc',
      css: 'themes/presets/arc.css',
      description: 'Neon tunnel motion theme',
      accent: '#ff3d00',
      tags: ['Motion-forward', 'Experimental'],
    },
  ];

  let themeCatalog = [...defaultThemeCatalog];
  let allowedThemes = new Set(themeCatalog.map((theme) => theme.id));
  let themesById = new Map(themeCatalog.map((theme) => [theme.id, theme]));
  let fallbackThemeId = 'default';

  const sanitizeThemeId = (value) => {
    const stringValue = String(value || '').toLowerCase();
    return /^[a-z0-9-]+$/.test(stringValue) ? stringValue : 'default';
  };

  const sanitizeThemeAccent = (value) => {
    const stringValue = String(value || '').trim();
    return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(stringValue) ? stringValue : '';
  };

  const sanitizeThemeCssPath = (value) => {
    const candidate = String(value || '').trim();
    if (!candidate.startsWith('themes/')) return '';
    if (candidate.includes('..') || candidate.includes('\\')) return '';
    if (!candidate.endsWith('.css')) return '';
    return /^themes\/[a-z0-9/_-]+\.css$/.test(candidate) ? candidate : '';
  };

  const sanitizeThemeTags = (value) => {
    if (!Array.isArray(value)) return [];

    return value
      .map((tag) => String(tag || '').trim())
      .filter(Boolean)
      .map((tag) => tag.slice(0, 24))
      .slice(0, 3);
  };

  const sanitizeGeneratedAt = (value) => {
    const candidate = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(candidate)) return null;
    const parsed = Date.parse(candidate);
    return Number.isFinite(parsed) ? new Date(parsed) : null;
  };

  const normalizeTheme = (value) => {
    const candidate = sanitizeThemeId(value);
    return allowedThemes.has(candidate) ? candidate : fallbackThemeId;
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
    const theme = themesById.get(themeId) || themesById.get(fallbackThemeId) || themeCatalog[0];
    if (!theme?.css) return;

    const href = resolveAssetUrl(theme.css);
    if (!href) return;

    const link = ensureThemeStylesheet();
    if (link.getAttribute('href') !== href) {
      link.setAttribute('href', href);
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

  const renderThemePresetButtons = (activeTheme) => {
    if (!themePresetList) return;

    const currentTheme = normalizeTheme(activeTheme);
    themePresetList.innerHTML = '';

    themeCatalog.forEach((theme) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'theme-preset';
      button.dataset.theme = theme.id;
      button.setAttribute('aria-pressed', theme.id === currentTheme ? 'true' : 'false');

      const title = document.createElement('span');
      title.className = 'theme-preset__title';
      title.textContent = theme.label;

      const header = document.createElement('span');
      header.className = 'theme-preset__header';
      header.appendChild(title);

      const accent = sanitizeThemeAccent(theme.accent);
      if (accent) {
        const swatch = document.createElement('span');
        swatch.className = 'theme-preset__swatch';
        swatch.style.background = accent;
        swatch.setAttribute('aria-hidden', 'true');
        header.appendChild(swatch);
      }

      const description = document.createElement('span');
      description.className = 'theme-preset__desc';
      description.textContent = theme.description || 'Theme preset';

      const tags = sanitizeThemeTags(theme.tags);
      const tagsRow = document.createElement('span');
      tagsRow.className = 'theme-preset__tags';
      tags.forEach((tag) => {
        const tagEl = document.createElement('span');
        tagEl.className = 'theme-tag';
        tagEl.textContent = tag;
        tagsRow.appendChild(tagEl);
      });

      button.append(header, description);
      if (tags.length) button.appendChild(tagsRow);
      button.addEventListener('click', () => applyTheme(theme.id));
      themePresetList.appendChild(button);
    });
  };

  const setThemeHint = (themeId) => {
    const description = themesById.get(themeId)?.description;
    const hint = description || 'Switch visual style instantly.';
    if (themeHint) themeHint.textContent = hint;
    if (themePanelHint) themePanelHint.textContent = hint;
  };

  const renderThemeManifestStamp = (generatedAt) => {
    if (!themeManifestStamp || !generatedAt) return;

    const formatter = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });

    const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((generatedAt.getTime() - Date.now()) / MS_PER_DAY);
    const relative = relativeFormatter.format(diffDays, 'day');

    themeManifestStamp.textContent = `Theme registry refreshed ${formatter.format(generatedAt)} (${relative}).`;
    themeManifestStamp.hidden = false;
    themeManifestStamp.title = generatedAt.toISOString();
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
    renderThemePresetButtons(nextTheme);
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
      renderThemeManifestStamp(sanitizeGeneratedAt(payload?.generatedAt));
      const themes = Array.isArray(payload?.themes) ? payload.themes : [];

      const validated = themes
        .map((theme) => ({
          id: sanitizeThemeId(theme?.id),
          label: String(theme?.label || '').trim(),
          css: sanitizeThemeCssPath(theme?.css),
          description: String(theme?.description || '').trim(),
          accent: sanitizeThemeAccent(theme?.accent),
          tags: sanitizeThemeTags(theme?.tags),
        }))
        .filter((theme) => theme.id && theme.label && theme.css);

      if (!validated.length) return;

      const requestedDefault = sanitizeThemeId(payload?.defaultTheme);
      const manifestDefault = validated.find((theme) => theme.id === requestedDefault)?.id;
      const explicitDefault = validated.find((theme) => theme.id === 'default')?.id;

      themeCatalog = validated;
      allowedThemes = new Set(validated.map((theme) => theme.id));
      themesById = new Map(validated.map((theme) => [theme.id, theme]));
      fallbackThemeId = manifestDefault || explicitDefault || validated[0].id;
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

  const hydrateProjectFreshness = async () => {
    const cards = Array.from(document.querySelectorAll('.project-card[href]'));
    const localCards = cards.filter((card) => {
      const href = card.getAttribute('href') || '';
      if (!href || href.startsWith('#')) return false;

      try {
        const url = new URL(href, window.location.href);
        return url.origin === window.location.origin && url.pathname.startsWith('/projects/');
      } catch (e) {
        return false;
      }
    });

    if (!localCards.length) return;

    const formatter = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });

    const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    const sanitizePath = (value) => {
      const candidate = String(value || '').trim();
      if (!candidate.startsWith('/projects/')) return '';
      return /^\/projects\/[a-z0-9-]+\/$/.test(candidate) ? candidate : '';
    };

    const sanitizeDate = (value) => {
      const candidate = String(value || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return null;
      const parsed = Date.parse(`${candidate}T00:00:00Z`);
      return Number.isFinite(parsed) ? new Date(parsed) : null;
    };

    const sanitizeNote = (value) => String(value || '').trim().slice(0, 140);

    const formatRelativeDays = (date) => {
      const diffDays = Math.round((date.getTime() - Date.now()) / MS_PER_DAY);
      return relativeFormatter.format(diffDays, 'day');
    };

    const freshnessClass = (date) => {
      const ageDays = Math.floor((Date.now() - date.getTime()) / MS_PER_DAY);
      if (ageDays <= 30) return 'project-card__meta--fresh';
      if (ageDays <= 120) return 'project-card__meta--steady';
      return 'project-card__meta--stale';
    };

    const renderManifestStamp = (generatedAt) => {
      const stamp = document.getElementById('projectManifestStamp');
      if (!stamp || !generatedAt) return;

      stamp.textContent = `Metadata manifest refreshed ${formatter.format(generatedAt)} (${formatRelativeDays(generatedAt)}).`;
      stamp.hidden = false;
      stamp.title = generatedAt.toISOString();
    };

    const fetchManifest = async () => {
      try {
        const response = await fetch(PROJECT_MANIFEST_URL, { cache: 'no-store' });
        if (!response.ok) return { byPath: new Map(), generatedAt: null };

        const payload = await response.json();
        const rows = Array.isArray(payload?.projects) ? payload.projects : [];

        const entries = rows
          .map((project) => {
            const path = sanitizePath(project?.path);
            const updated = sanitizeDate(project?.updated);
            if (!path || !updated) return null;
            return [path, { updated, note: sanitizeNote(project?.note) }];
          })
          .filter(Boolean);

        return {
          byPath: new Map(entries),
          generatedAt: sanitizeGeneratedAt(payload?.generatedAt),
        };
      } catch (e) {
        return { byPath: new Map(), generatedAt: null };
      }
    };

    const manifest = await fetchManifest();
    const manifestByPath = manifest.byPath;
    renderManifestStamp(manifest.generatedAt);

    const fetchCardLastUpdated = async (card) => {
      const href = card.getAttribute('href') || '';
      const url = new URL(href, window.location.href);

      let modifiedDate = manifestByPath.get(url.pathname)?.updated || null;
      let freshnessNote = manifestByPath.get(url.pathname)?.note || '';
      let freshnessSource = modifiedDate ? 'manifest' : 'header';

      if (!modifiedDate) {
        try {
          const response = await fetch(url.href, { method: 'HEAD', cache: 'no-store' });
          if (response.ok) {
            const headerValue = response.headers.get('last-modified');
            const parsed = Date.parse(headerValue || '');
            if (Number.isFinite(parsed)) modifiedDate = new Date(parsed);
          }
        } catch (e) {
          // Graceful fallback below.
        }
      }

      if (!modifiedDate) return;

      let metaEl = card.querySelector('.project-card__meta');
      if (!metaEl) {
        metaEl = document.createElement('p');
        metaEl.className = 'project-card__meta';
        card.appendChild(metaEl);
      }

      const sourceLabel = freshnessSource === 'manifest' ? 'metadata manifest' : 'Last-Modified fallback';
      metaEl.className = `project-card__meta ${freshnessClass(modifiedDate)}`;
      metaEl.textContent = `Updated ${formatter.format(modifiedDate)} (${formatRelativeDays(modifiedDate)}) · ${sourceLabel}`;
      metaEl.title = `${modifiedDate.toISOString()} · ${sourceLabel}`;

      let noteEl = card.querySelector('.project-card__meta-note');
      if (freshnessNote) {
        if (!noteEl) {
          noteEl = document.createElement('p');
          noteEl.className = 'project-card__meta-note';
          card.appendChild(noteEl);
        }
        noteEl.textContent = freshnessNote;
        metaEl.setAttribute('aria-label', `${metaEl.textContent}. ${freshnessNote}`);
      } else if (noteEl) {
        noteEl.remove();
      }
    };

    await Promise.all(localCards.map(fetchCardLastUpdated));
  };

  void hydrateProjectFreshness();

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

  // Hero title shine (flashlight-like hover)
  const heroShineTitle = document.querySelector('.hero-title-shine');
  if (heroShineTitle && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const onMove = (event) => {
      const rect = heroShineTitle.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      heroShineTitle.style.setProperty('--shine-x', `${Math.max(0, Math.min(100, x))}%`);
      heroShineTitle.style.setProperty('--shine-y', `${Math.max(0, Math.min(100, y))}%`);
    };

    heroShineTitle.addEventListener('mouseenter', () => {
      heroShineTitle.classList.add('is-shining');
      heroShineTitle.style.setProperty('--shine-opacity', '1');
    });
    heroShineTitle.addEventListener('mousemove', onMove);
    heroShineTitle.addEventListener('mouseleave', () => {
      heroShineTitle.classList.remove('is-shining');
      heroShineTitle.style.setProperty('--shine-opacity', '0');
    });
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
