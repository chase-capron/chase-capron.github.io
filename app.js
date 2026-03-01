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
      id: 'matrix',
      label: 'Matrix',
      css: 'themes/presets/matrix.css',
      description: 'Falling green code + phosphor text treatment',
      accent: '#36ff77',
      tags: ['Cinematic', 'Animated', 'High contrast'],
    },
    {
      id: 'classic-mac',
      label: 'Classic Mac',
      css: 'themes/presets/classic-mac.css',
      description: 'Retro Mac OS style UI with grayscale chrome',
      accent: '#1d49c6',
      tags: ['Retro', 'Monochrome', 'Classic UI'],
    },
    {
      id: 'simpsons',
      label: 'Springfield',
      css: 'themes/presets/simpsons.css',
      description: 'Cartoon sky theme with clouds-to-house scroll scene',
      accent: '#fed90f',
      tags: ['Playful', 'Scrolling Scene', 'Sky'],
    },
  ];

  let themeCatalog = [...defaultThemeCatalog];
  let allowedThemes = new Set(themeCatalog.map((theme) => theme.id));
  let themesById = new Map(themeCatalog.map((theme) => [theme.id, theme]));
  let fallbackThemeId = 'matrix';

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

  const matrixState = {
    canvas: null,
    ctx: null,
    columns: [],
    animationId: null,
    startTimer: null,
    running: false,
    fontSize: 16,
    width: 0,
    height: 0,
    lastFrameAt: 0,
  };

  const MATRIX_CHARS = 'アァカサタナハマヤャラワ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+-<>[]{}';

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const shouldRunMatrixRain = (themeId) => themeId === 'matrix' && !prefersReducedMotion();

  const ensureMatrixCanvas = () => {
    if (matrixState.canvas instanceof HTMLCanvasElement) return matrixState.canvas;

    const canvas = document.createElement('canvas');
    canvas.id = 'matrixRainCanvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-1';
    document.documentElement.appendChild(canvas);

    matrixState.canvas = canvas;
    matrixState.ctx = canvas.getContext('2d', { alpha: true });
    return canvas;
  };

  const resizeMatrix = () => {
    const canvas = ensureMatrixCanvas();
    const dpr = Math.max(1, Math.min(1.5, window.devicePixelRatio || 1));
    const width = window.innerWidth;
    const height = window.innerHeight;

    matrixState.fontSize = width <= 768 ? 18 : 16;
    matrixState.width = width;
    matrixState.height = height;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = matrixState.ctx;
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const columnsCount = Math.max(10, Math.floor(width / matrixState.fontSize));
    matrixState.columns = Array.from({ length: columnsCount }, () =>
      Math.floor((Math.random() * height) / matrixState.fontSize)
    );
  };

  const drawMatrixFrame = (now) => {
    if (!matrixState.running || !matrixState.ctx) return;

    if (now - matrixState.lastFrameAt < 66) {
      matrixState.animationId = window.requestAnimationFrame(drawMatrixFrame);
      return;
    }
    matrixState.lastFrameAt = now;

    const { ctx, width, height, fontSize, columns } = matrixState;

    ctx.fillStyle = 'rgba(2, 10, 5, 0.18)';
    ctx.fillRect(0, 0, width, height);

    ctx.font = `${fontSize}px "Courier New", monospace`;

    for (let i = 0; i < columns.length; i += 1) {
      const x = i * fontSize;
      const y = columns[i] * fontSize;
      const char = MATRIX_CHARS.charAt(Math.floor(Math.random() * MATRIX_CHARS.length));

      ctx.fillStyle = 'rgba(67, 255, 138, 0.9)';
      ctx.fillText(char, x, y);

      if (y > height && Math.random() > 0.975) {
        columns[i] = 0;
      } else {
        columns[i] += 1;
      }
    }

    matrixState.animationId = window.requestAnimationFrame(drawMatrixFrame);
  };

  const stopMatrixRain = () => {
    matrixState.running = false;
    if (matrixState.startTimer) {
      window.clearTimeout(matrixState.startTimer);
      matrixState.startTimer = null;
    }
    if (matrixState.animationId) {
      window.cancelAnimationFrame(matrixState.animationId);
      matrixState.animationId = null;
    }
    if (matrixState.canvas) {
      matrixState.canvas.remove();
      matrixState.canvas = null;
      matrixState.ctx = null;
      matrixState.columns = [];
    }
  };

  const startMatrixRain = () => {
    if (matrixState.running || matrixState.startTimer) return;

    const boot = () => {
      matrixState.startTimer = null;
      ensureMatrixCanvas();
      resizeMatrix();

      matrixState.running = true;
      matrixState.lastFrameAt = 0;

      if (matrixState.animationId) {
        window.cancelAnimationFrame(matrixState.animationId);
      }

      matrixState.animationId = window.requestAnimationFrame(drawMatrixFrame);
    };

    // Let initial hero text animation render smoothly first.
    matrixState.startTimer = window.setTimeout(() => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(boot, { timeout: 800 });
      } else {
        boot();
      }
    }, 900);
  };

  const syncMatrixRain = (themeId) => {
    if (shouldRunMatrixRain(themeId)) {
      startMatrixRain();
    } else {
      stopMatrixRain();
    }
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
    syncMatrixRain(nextTheme);

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

  window.addEventListener('resize', () => {
    if (matrixState.running) resizeMatrix();
  });

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handleReducedMotionChange = () => {
    const activeTheme = normalizeTheme(root.dataset.theme || getStoredTheme());
    syncMatrixRain(activeTheme);
  };

  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
  } else if (typeof reducedMotionQuery.addListener === 'function') {
    reducedMotionQuery.addListener(handleReducedMotionChange);
  }

  document.addEventListener('visibilitychange', () => {
    const activeTheme = normalizeTheme(root.dataset.theme || getStoredTheme());
    if (document.hidden) {
      if (matrixState.animationId) {
        window.cancelAnimationFrame(matrixState.animationId);
        matrixState.animationId = null;
      }
      matrixState.running = false;
    } else if (shouldRunMatrixRain(activeTheme)) {
      startMatrixRain();
    }
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
      const doc = document.documentElement;
      const maxScroll = Math.max(1, (doc.scrollHeight || 1) - window.innerHeight);
      const progress = Math.max(0, Math.min(1, y / maxScroll));

      const useDrift = (root.dataset.theme || 'default') !== 'arc';
      root.style.setProperty('--bg-shift-a', `${useDrift ? Math.round(y * 0.03) : 0}px`);
      root.style.setProperty('--bg-shift-b', `${useDrift ? Math.round(y * -0.02) : 0}px`);
      root.style.setProperty('--bg-shift-c', `${useDrift ? Math.round(y * 0.015) : 0}px`);
      root.style.setProperty('--scroll-progress', progress.toFixed(4));
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

  // Hero rotating suffix (backspace + retype every cycle)
  // Hero marquee project tiles: baggage-claim style drop + bump collisions
  const heroTrack = document.querySelector('.hero-marquee__track');
  if (heroTrack && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const tiles = Array.from(heroTrack.querySelectorAll('.project-tile'));
    tiles.forEach((tile, idx) => {
      tile.style.animationDelay = `${Math.min(700, idx * 120)}ms`;
    });

    window.setTimeout(() => {
      window.setInterval(() => {
        if (tiles.length < 2) return;
        const i = Math.floor(Math.random() * tiles.length);
        const j = (i + 1 + Math.floor(Math.random() * (tiles.length - 1))) % tiles.length;
        tiles[i].classList.remove('bump');
        tiles[j].classList.remove('bump');
        void tiles[i].offsetWidth;
        void tiles[j].offsetWidth;
        tiles[i].classList.add('bump');
        tiles[j].classList.add('bump');
      }, 2400);
    }, 1100);
  }

  const rotatingSuffixEl = document.querySelector('#hero-rotating-suffix');
  const rotatingTitleEl = rotatingSuffixEl?.closest('.hero-title-shine');
  if (rotatingSuffixEl && rotatingTitleEl) {
    const prefix = rotatingTitleEl.dataset.prefix || 'Home automation heavy, AI-assisted tooling, and ';
    const phrases = [
      'hands-on maker projects.',
      'making coding cooler.',
      'probably coding something right now.',
      'building tiny tools that punch above their weight.',
      'shipping practical automations daily.',
      'turning coffee into shipped features.',
      'making homelab workflows feel effortless.',
      'connecting hardware with smarter software.',
      'obsessing over clean UX and useful systems.',
      'teaching machines to handle the boring stuff.',
      'prototyping ideas into real tools fast.',
      'stacking small wins into big systems.',
      'engineering projects that actually get used.',
      'automating what should have been automated years ago.',
      'gluing APIs together until they feel like magic.',
      'keeping the stack practical, reliable, and fun.',
      'making smart-home chaos behave itself.',
      'building tools that save clicks and time.',
      'turning repetitive tasks into one-button flows.',
      'crafting automations that just quietly work.',
      'chaining APIs into useful everyday workflows.',
      'debugging edge cases so you do not have to.',
      'shipping maker ideas from sketch to reality.',
      'balancing speed, polish, and reliability.',
      'writing glue code that makes everything nicer.',
    ];

    let phraseIndex = 0;
    let cycleCount = 0;
    let animating = false;

    const syncTitleText = (suffixText) => {
      rotatingTitleEl.dataset.text = `${prefix}${suffixText}`;
    };

    const lockHeroTitleHeight = () => {
      const initial = rotatingSuffixEl.textContent || phrases[0];
      let maxHeight = rotatingTitleEl.offsetHeight;

      for (const phrase of phrases) {
        rotatingSuffixEl.textContent = phrase;
        syncTitleText(phrase);
        maxHeight = Math.max(maxHeight, rotatingTitleEl.offsetHeight);
      }

      rotatingSuffixEl.textContent = initial;
      syncTitleText(initial);
      rotatingTitleEl.style.minHeight = `${maxHeight}px`;
    };

    const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

    const typeToPhrase = async (target) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        rotatingSuffixEl.textContent = target;
        syncTitleText(target);
        return;
      }

      animating = true;
      let current = rotatingSuffixEl.textContent || '';

      while (current.length > 0) {
        current = current.slice(0, -1);
        rotatingSuffixEl.textContent = current;
        syncTitleText(current);
        await sleep(22);
      }

      for (const ch of target) {
        current += ch;
        rotatingSuffixEl.textContent = current;
        syncTitleText(current);
        await sleep(28);
      }

      animating = false;
    };

    syncTitleText(rotatingSuffixEl.textContent || phrases[0]);
    lockHeroTitleHeight();

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        lockHeroTitleHeight();
      }, 120);
    });

    const hintedPhrase = 'and if you\'re still here, tap me 10 times for a surprise.';

    const cycleLoop = async () => {
      while (true) {
        if (!animating) {
          cycleCount += 1;

          if (cycleCount % 5 === 0) {
            await typeToPhrase(hintedPhrase);
            await sleep(15000);
          } else {
            phraseIndex = (phraseIndex + 1) % phrases.length;
            await typeToPhrase(phrases[phraseIndex]);
            await sleep(5000);
          }
        } else {
          await sleep(250);
        }
      }
    };

    cycleLoop();
  }

  // Hero logo easter egg: 10 taps/clicks triggers spin + zoom animation
  const heroLogoEgg = document.querySelector('#hero-logo-easter-egg');
  if (heroLogoEgg) {
    let tapCount = 0;
    let tapTimer = null;

    const resetTaps = () => {
      tapCount = 0;
      if (tapTimer) {
        window.clearTimeout(tapTimer);
        tapTimer = null;
      }
    };

    const burstConfetti = () => {
      const host = heroLogoEgg.closest('.hero__logo') || heroLogoEgg.parentElement;
      if (!host) return;
      const colors = ['#ff6e21', '#ffd166', '#2f83ff', '#6ee7b7', '#f472b6', '#ffffff', '#8b5cf6'];
      const pieceCount = 44;
      host.style.position = host.style.position || 'relative';
      host.classList.remove('easter-active');
      void host.offsetWidth;
      host.classList.add('easter-active');

      for (let i = 0; i < pieceCount; i += 1) {
        const piece = document.createElement('span');
        piece.className = 'logo-confetti-piece';
        if (i % 7 === 0) piece.classList.add('is-star');
        if (i % 5 === 0) piece.classList.add('is-ribbon');
        const angle = (Math.PI * 2 * i) / pieceCount + (Math.random() * 0.4 - 0.2);
        const distance = 95 + Math.random() * 170;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        const color = colors[Math.floor(Math.random() * colors.length)];
        piece.style.setProperty('--dx', `${dx}px`);
        piece.style.setProperty('--dy', `${dy}px`);
        piece.style.background = color;
        piece.style.color = color;
        piece.style.left = '50%';
        piece.style.top = '50%';
        piece.style.transform = `translate(-50%, -50%) rotate(${Math.random() * 360}deg)`;
        host.appendChild(piece);
        piece.addEventListener('animationend', () => piece.remove());
      }

      window.setTimeout(() => host.classList.remove('easter-active'), 1300);
    };

    heroLogoEgg.addEventListener('click', () => {
      tapCount += 1;
      if (tapTimer) window.clearTimeout(tapTimer);
      tapTimer = window.setTimeout(resetTaps, 6000);

      if (tapCount >= 10) {
        heroLogoEgg.classList.remove('easter-spin');
        // force reflow so repeated triggers replay animation
        void heroLogoEgg.offsetWidth;
        heroLogoEgg.classList.add('easter-spin');
        burstConfetti();
        resetTaps();
      }
    });

    heroLogoEgg.addEventListener('animationend', () => {
      heroLogoEgg.classList.remove('easter-spin');
    });
  }

  // Current stack: Tetris-like row-fill simulation with natural chip widths
  const stackRoot = document.querySelector('.chips--stack');
  if (stackRoot && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const chips = Array.from(stackRoot.querySelectorAll('.chip'));
    if (chips.length > 0) {
      stackRoot.classList.add('chips--stack--tetris');

      const GAP = 8;
      const CYCLE_MS = 10000;
      const DROP_STEP_MS = 80;
      const LATERAL_STEP = 8;
      const BETWEEN_PIECES_MS = 90;
      const PADDING_X = 8;
      const PADDING_Y = 8;
      let busy = false;
      let timer = null;

      const pause = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

      const shuffle = (arr) => {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      };

      const measure = () => {
        chips.forEach((chip) => {
          chip.classList.remove('is-exiting', 'is-falling');
          chip.style.opacity = '1';
          chip.style.transform = 'translate3d(-9999px, -9999px, 0)';
          chip.style.transitionDelay = '0ms';
          chip.style.transitionDuration = '260ms';
        });

        let chipHeights = chips.map((chip) => Math.ceil(chip.getBoundingClientRect().height));
        const usableW = Math.max(220, stackRoot.clientWidth - PADDING_X * 2);

        chips.forEach((chip) => {
          chip.style.maxWidth = `${usableW}px`;
          chip.style.fontSize = '11px';
          chip.style.padding = '4px 8px';
          if (chip.getBoundingClientRect().width > usableW) {
            chip.style.fontSize = '10px';
            chip.style.padding = '3px 7px';
          }
        });

        chipHeights = chips.map((chip) => Math.ceil(chip.getBoundingClientRect().height));
        const chipWidths = chips.map((chip) => Math.ceil(chip.getBoundingClientRect().width));
        const rowH = Math.max(...chipHeights, 30);
        const usableH = Math.max(120, stackRoot.clientHeight - PADDING_Y * 2);
        const maxRows = Math.max(2, Math.floor((usableH + GAP) / (rowH + GAP)));

        return { chipWidths, rowH, usableW, maxRows };
      };

      const pickRow = (rows, chipW, usableW) => {
        let best = null;

        rows.forEach((row, idx) => {
          const nextUsed = row.used + (row.used > 0 ? GAP : 0) + chipW;
          if (nextUsed <= usableW) {
            const leftover = usableW - nextUsed;
            if (!best || leftover < best.leftover) best = { idx, leftover };
          }
        });

        if (best) return best.idx;
        return rows.length;
      };

      const buildPlacement = (order, chipWidths, rowH, usableW, maxRows) => {
        const rows = [];
        const placements = [];

        order.forEach((chip) => {
          const idx = chips.indexOf(chip);
          const chipW = chipWidths[idx];
          const rowIndex = pickRow(rows, chipW, usableW);

          // If we are out of rows, skip this chip for this cycle instead of overlapping.
          if (rowIndex >= maxRows) {
            chip.style.opacity = '0';
            chip.style.transform = 'translate3d(-9999px, -9999px, 0)';
            return;
          }

          while (rows.length <= rowIndex) {
            rows.push({ used: 0 });
          }

          const row = rows[rowIndex];
          const x = row.used + (row.used > 0 ? GAP : 0);
          row.used = x + chipW;

          const y = (maxRows - 1 - rowIndex) * (rowH + GAP);
          placements.push({ chip, x: x + PADDING_X, y: y + PADDING_Y, rowIndex });
        });

        return { placements, rows };
      };

      const animateDrop = async ({ chip, x: tx, y: ty }) => {
        chip.classList.add('is-falling');
        chip.style.opacity = '1';

        const chipW = chip.getBoundingClientRect().width;
        let x = tx + (Math.random() * 12 - 6);
        x = Math.max(PADDING_X, Math.min(x, stackRoot.clientWidth - chipW - PADDING_X));
        let y = -44 - Math.random() * 20;

        const lateralNudge = () => {
          const diff = tx - x;
          if (Math.abs(diff) < 2) return;
          x += Math.sign(diff) * Math.min(Math.abs(diff), LATERAL_STEP);
        };

        while (y < ty) {
          lateralNudge();
          y += Math.min(18, ty - y);
          chip.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          await pause(DROP_STEP_MS);
        }

        chip.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
        chip.classList.remove('is-falling');
      };

      const dropOut = async (order) => {
        const floorY = stackRoot.clientHeight + 34;
        order.forEach((chip, i) => {
          chip.classList.add('is-exiting');
          chip.style.transitionDelay = `${i * 22}ms`;
          const xMatch = chip.style.transform.match(/translate3d\(([^,]+)/);
          const x = xMatch ? xMatch[1] : '0px';
          chip.style.transform = `translate3d(${x}, ${floorY}px, 0)`;
        });

        await pause(640);
        order.forEach((chip) => chip.classList.remove('is-exiting'));
      };

      const run = async () => {
        if (busy) return;
        if (timer) {
          window.clearTimeout(timer);
          timer = null;
        }
        busy = true;

        const order = shuffle(chips);
        const { chipWidths, rowH, usableW, maxRows } = measure();
        const { placements } = buildPlacement(order, chipWidths, rowH, usableW, maxRows);

        for (const item of placements) {
          await animateDrop(item);
          await pause(BETWEEN_PIECES_MS);
        }

        await pause(Math.max(1000, CYCLE_MS - placements.length * (DROP_STEP_MS + BETWEEN_PIECES_MS) - 700));
        await dropOut(placements.map((p) => p.chip));

        busy = false;
        timer = window.setTimeout(() => {
          void run();
        }, 120);
      };

      let resizeTimer = null;
      window.addEventListener('resize', () => {
        if (resizeTimer) window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          if (timer) window.clearTimeout(timer);
          if (!busy) void run();
        }, 180);
      });

      void run();
    }
  }

  // Reveal-on-scroll
  const allRevealNodes = Array.from(document.querySelectorAll('[data-reveal]'));
  allRevealNodes.forEach((node) => {
    const delay = Number(node.dataset.delay || 0);
    node.style.setProperty('--reveal-delay', `${delay}ms`);
  });

  // Mobile-only override: keep the View Projects CTA visible on first load
  // while preserving existing reveal behavior for the rest of the page.
  if (window.matchMedia('(max-width: 760px)').matches) {
    const mobileCta = document.querySelector('.hero__actions--mobile[data-reveal]');
    if (mobileCta) {
      mobileCta.classList.add('is-in');
      mobileCta.style.setProperty('--reveal-delay', '0ms');
    }
  }

  // Hidden Retro Arcade: unlocked by tapping Legacy Device Builds 10 times.
  const legacyTrigger = Array.from(document.querySelectorAll('.hardware-card .hardware-card__name'))
    .find((n) => n.textContent?.trim() === 'Legacy Device Builds')
    ?.closest('a.hardware-card');
  const arcadeShell = document.getElementById('retroArcade');
  const arcadeTabs = Array.from(document.querySelectorAll('[data-arcade-tab]'));
  const arcadePanes = Array.from(document.querySelectorAll('[data-arcade-pane]'));
  const arcadeClosers = Array.from(document.querySelectorAll('[data-arcade-close]'));

  const setArcadeTab = (id) => {
    arcadeTabs.forEach((b) => b.classList.toggle('is-active', b.dataset.arcadeTab === id));
    arcadePanes.forEach((p) => p.classList.toggle('is-active', p.dataset.arcadePane === id));
  };

  if (legacyTrigger && arcadeShell) {
    let taps = 0;
    let tapTimer = null;
    legacyTrigger.addEventListener('click', (ev) => {
      ev.preventDefault();
      taps += 1;
      if (tapTimer) window.clearTimeout(tapTimer);
      tapTimer = window.setTimeout(() => { taps = 0; }, 6000);
      if (taps >= 10) {
        taps = 0;
        arcadeShell.classList.add('is-open');
        arcadeShell.setAttribute('aria-hidden', 'false');
      }
    });

    arcadeTabs.forEach((btn) => btn.addEventListener('click', () => setArcadeTab(btn.dataset.arcadeTab)));
    arcadeClosers.forEach((btn) => btn.addEventListener('click', () => {
      arcadeShell.classList.remove('is-open');
      arcadeShell.setAttribute('aria-hidden', 'true');
    }));
  }

  // Pong simulator
  const pongCanvas = document.getElementById('arcadePong');
  if (pongCanvas) {
    const ctx = pongCanvas.getContext('2d');
    let w = pongCanvas.width; let h = pongCanvas.height;
    const ball = { x: w / 2, y: h / 2, vx: 3.2, vy: 2.4, r: 7 };
    const left = { y: h / 2 - 40, h: 80 };
    const right = { y: h / 2 - 40, h: 80 };

    const loop = () => {
      ctx.fillStyle = '#050814'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([6, 10]);
      ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke(); ctx.setLineDash([]);

      left.y += ((ball.y - left.h / 2) - left.y) * 0.08;
      right.y += ((ball.y - right.h / 2) - right.y) * 0.08;

      ball.x += ball.vx; ball.y += ball.vy;
      if (ball.y < ball.r || ball.y > h - ball.r) ball.vy *= -1;

      const hitLeft = ball.x - ball.r < 24 && ball.y > left.y && ball.y < left.y + left.h;
      const hitRight = ball.x + ball.r > w - 24 && ball.y > right.y && ball.y < right.y + right.h;
      if (hitLeft || hitRight) {
        ball.vx *= -1.03;
        ball.vy += (Math.random() * 1.2 - 0.6);
      }
      if (ball.x < -40 || ball.x > w + 40) {
        ball.x = w / 2; ball.y = h / 2; ball.vx = (Math.random() > 0.5 ? 1 : -1) * 3.2; ball.vy = 2.4;
      }

      ctx.fillStyle = '#9ad1ff';
      ctx.fillRect(14, left.y, 10, left.h);
      ctx.fillRect(w - 24, right.y, 10, right.h);
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();

      requestAnimationFrame(loop);
    };
    loop();
  }

  // Tetris simulator (auto drop demo)
  const tetrisCanvas = document.getElementById('arcadeTetris');
  if (tetrisCanvas) {
    const ctx = tetrisCanvas.getContext('2d');
    const cols = 12, rows = 20, size = 16;
    const offX = (tetrisCanvas.width - cols * size) / 2;
    const offY = (tetrisCanvas.height - rows * size) / 2;
    const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    let piece = { x: 5, y: 0, c: '#7ef29a' };

    const draw = () => {
      ctx.fillStyle = '#050814'; ctx.fillRect(0, 0, tetrisCanvas.width, tetrisCanvas.height);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c]) { ctx.fillStyle = grid[r][c]; ctx.fillRect(offX + c * size, offY + r * size, size - 1, size - 1); }
          else { ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(offX + c * size, offY + r * size, size - 1, size - 1); }
        }
      }
      ctx.fillStyle = piece.c;
      ctx.fillRect(offX + piece.x * size, offY + piece.y * size, size - 1, size - 1);
    };

    setInterval(() => {
      if (piece.y < rows - 1 && !grid[piece.y + 1][piece.x]) piece.y += 1;
      else {
        grid[piece.y][piece.x] = piece.c;
        piece = { x: Math.floor(Math.random() * cols), y: 0, c: ['#7ef29a','#6fc7ff','#ffd166','#ff8fab'][Math.floor(Math.random()*4)] };
      }
      // clear random full rows for arcade feel
      for (let r = rows - 1; r >= 0; r--) {
        if (grid[r].every(Boolean)) {
          grid.splice(r, 1);
          grid.unshift(Array(cols).fill(0));
        }
      }
      draw();
    }, 180);
    draw();
  }

  // Pokemon-style battle simulator
  const enemyHp = document.getElementById('enemyHp');
  const playerHp = document.getElementById('playerHp');
  const battleLog = document.getElementById('battleLog');
  const moveButtons = Array.from(document.querySelectorAll('[data-battle-move]'));
  if (enemyHp && playerHp && battleLog && moveButtons.length) {
    let eh = 100; let ph = 100;
    const moveText = {
      ship: 'Promptmon used Ship Patch.',
      lint: 'Promptmon used Lint Beam.',
      rollback: 'Promptmon used Rollback.',
      reboot: 'Promptmon used Reboot.'
    };
    const update = () => { enemyHp.textContent = String(Math.max(0, eh)); playerHp.textContent = String(Math.max(0, ph)); };
    moveButtons.forEach((btn) => btn.addEventListener('click', () => {
      if (eh <= 0 || ph <= 0) { eh = 100; ph = 100; battleLog.textContent = 'Battle reset.'; update(); return; }
      const dmg = 12 + Math.floor(Math.random() * 14);
      const counter = 8 + Math.floor(Math.random() * 12);
      eh -= dmg;
      if (eh > 0) ph -= counter;
      if (eh <= 0) battleLog.textContent = `${moveText[btn.dataset.battleMove]} Wild Debugmon fainted.`;
      else if (ph <= 0) battleLog.textContent = `${moveText[btn.dataset.battleMove]} Promptmon fainted.`;
      else battleLog.textContent = `${moveText[btn.dataset.battleMove]} Wild Debugmon counters.`;
      update();
    }));
  }

  const revealNodes = allRevealNodes.filter((node) => !node.classList.contains('is-in'));

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
