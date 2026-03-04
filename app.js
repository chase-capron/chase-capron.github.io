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
    if (!theme?.css) return null;

    const href = resolveAssetUrl(theme.css);
    if (!href) return null;

    const link = ensureThemeStylesheet();
    if (link.getAttribute('href') !== href) {
      link.setAttribute('href', href);
    }

    return link;
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

  let arcadeController = null;
  let arcadeThemeSyncToken = 0;

  const scheduleArcadeThemeSync = (themeId, stylesheetLink = null) => {
    if (!arcadeController || typeof arcadeController.syncTheme !== 'function') return;

    const token = ++arcadeThemeSyncToken;
    const runSync = () => {
      if (token !== arcadeThemeSyncToken) return;
      arcadeController.syncTheme(themeId);
    };

    runSync();

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(runSync);
    });

    if (stylesheetLink instanceof HTMLLinkElement) {
      const onThemeCssLoaded = () => {
        runSync();
      };
      stylesheetLink.addEventListener('load', onThemeCssLoaded, { once: true });
    }
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

    const themeLink = applyThemeStylesheet(nextTheme);
    renderThemeOptions(nextTheme);
    renderThemePresetButtons(nextTheme);
    setThemeHint(nextTheme);
    syncMatrixRain(nextTheme);
    scheduleArcadeThemeSync(nextTheme, themeLink);

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

  const initHeroBaggageLoop = () => {
    const marquee = document.querySelector('.hero-marquee');
    const track = marquee?.querySelector('.hero-marquee__track');
    if (!marquee || !track) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobileSafeFallback = window.matchMedia('(max-width: 760px) and (pointer: coarse)').matches;
    if (prefersReducedMotion || mobileSafeFallback) {
      marquee.dataset.baggageFallback = 'scroll';
      return;
    }

    delete marquee.dataset.baggageFallback;

    const tiles = Array.from(track.querySelectorAll('.project-tile'));
    if (!tiles.length) return;

    const STEP_SECONDS = 1 / 90;
    const MAX_FRAME_SECONDS = 0.05;
    const BELT_SPEED = 73;
    const SPEED_CONVERGENCE = 6.6;
    const BASE_GAP = 10;
    const GAP_JITTER = 7;
    const MIN_CONTACT_GAP = 0;
    const CONTACT_SOLVER_PASSES = 2;
    const CONTACT_CORRECTION_MAX = 14;
    const COLLISION_TRANSFER = 0.5;
    const COLLISION_NUDGE = 0.15;
    const GRAVITY = 1560;
    const DROP_START_Y = -58;
    const LANDING_BOUNCE = 0.16;
    const RECYCLE_MARGIN = 120;
    const MAX_ROTATION = 2.2;
    const MAX_PROPAGATION_IMPULSE = 36;
    const PROPAGATION_DECAY = 0.52;
    const RANDOM_BUMP_MIN_SECONDS = 1.05;
    const CASE_INJECT_MIN_SECONDS = 2.1;
    const CASE_INJECT_MAX_SECONDS = 4.0;
    const RANDOM_BUMP_MAX_SECONDS = 2.6;
    const JAM_IDLE_MIN_SECONDS = 6.4;
    const JAM_IDLE_MAX_SECONDS = 11.8;
    const JAM_HOLD_MIN_SECONDS = 0.7;
    const JAM_HOLD_MAX_SECONDS = 1.35;
    const JAM_RELEASE_MIN_SECONDS = 0.5;
    const JAM_RELEASE_MAX_SECONDS = 0.95;
    const SEED = 24117;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const fractional = (value) => value - Math.floor(value);
    const noise = (key) => fractional(Math.sin((key + SEED) * 12.9898) * 43758.5453123);
    const signedNoise = (key) => noise(key) * 2 - 1;

    let rngState = (SEED * 2654435761) >>> 0;
    const random = () => {
      rngState = (rngState * 1664525 + 1013904223) >>> 0;
      return rngState / 4294967296;
    };
    const randomRange = (min, max) => min + random() * (max - min);

    const BELT_SPEED_MIN = BELT_SPEED * 0.22;
    const BELT_SPEED_MAX = BELT_SPEED * 1.92;

    track.dataset.baggageSim = 'true';

    const bags = tiles.map((tile, index) => {
      const rect = tile.getBoundingClientRect();
      return {
        el: tile,
        width: Math.max(220, rect.width || tile.offsetWidth || 292),
        height: Math.max(140, rect.height || tile.offsetHeight || 168),
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        vx: BELT_SPEED,
        vy: 0,
        rot: 0,
        prevRot: 0,
        vrot: 0,
        baseSpeed: BELT_SPEED,
        mass: 1,
        bumpGain: 1,
        sequence: index,
        phase: 'belt',
        targetX: 0,
        chuteX: 0,
      };
    });

    let recycleSequence = bags.length;
    let spawnX = 0;
    let recycleX = -RECYCLE_MARGIN;
    let running = false;
    let inViewport = true;
    let hidden = document.hidden;
    let accumulator = 0;
    let lastTimestamp = 0;
    let rafId = 0;
    let randomBumpTimer = randomRange(RANDOM_BUMP_MIN_SECONDS, RANDOM_BUMP_MAX_SECONDS);
    let caseInjectTimer = randomRange(CASE_INJECT_MIN_SECONDS, CASE_INJECT_MAX_SECONDS);

    const jamState = {
      phase: 'idle',
      timer: randomRange(JAM_IDLE_MIN_SECONDS, JAM_IDLE_MAX_SECONDS),
      centerX: 0,
      radius: 0,
      strength: 0,
      releaseImpulse: 0,
    };

    const listSortedBags = () => [...bags].sort((a, b) => a.x - b.x);
    const bagCenterX = (bag) => bag.x + bag.width * 0.5;

    const applyTrackHeight = () => {
      const tallest = bags.reduce((maxHeight, bag) => Math.max(maxHeight, bag.height), 0);
      track.style.height = `${Math.ceil(tallest + 2)}px`;
    };

    const computeSpawnX = () => {
      const bounds = marquee.getBoundingClientRect();
      const width = Math.max(320, bounds.width || marquee.clientWidth || 320);
      spawnX = width + RECYCLE_MARGIN;
    };


    const findSpawnSlotX = (sortedBags, bagWidth) => {
      if (!sortedBags.length) return null;
      const viable = [];
      for (let i = 0; i < sortedBags.length - 1; i += 1) {
        const left = sortedBags[i];
        const right = sortedBags[i + 1];
        const gapStart = left.x + left.width + MIN_CONTACT_GAP;
        const gapEnd = right.x - MIN_CONTACT_GAP;
        const gapSize = gapEnd - gapStart;
        if (gapSize > bagWidth + 24) {
          viable.push(gapStart + (gapSize - bagWidth) * randomRange(0.12, 0.88));
        }
      }
      if (!viable.length) return null;
      return viable[Math.floor(randomRange(0, viable.length))];
    };

    const applyBagProfile = (bag, sequence) => {
      const speedVariance = 1 + signedNoise(sequence + 97) * 0.022;
      bag.sequence = sequence;
      bag.baseSpeed = BELT_SPEED * speedVariance;
      bag.mass = 0.96 + noise(sequence + 401) * 0.44;
      bag.bumpGain = 0.9 + noise(sequence + 577) * 0.24;
    };

    const applyImpulseToBag = (bag, impulse) => {
      const scaled = clamp(impulse * bag.bumpGain, -MAX_PROPAGATION_IMPULSE, MAX_PROPAGATION_IMPULSE);
      if (Math.abs(scaled) < 0.2) return;

      const phaseScale = bag.phase === 'drop' ? 0.5 : 0.92;
      bag.vx = clamp(bag.vx + scaled * phaseScale, BELT_SPEED_MIN, BELT_SPEED_MAX);
      bag.vy -= Math.abs(scaled) * 2.1 * phaseScale;
      bag.vrot += signedNoise(bag.sequence + random() * 400) * (0.05 + Math.abs(scaled) * 0.008) * phaseScale;
    };

    const propagateImpulse = (sortedBags, startIndex, impulse, radius = 2) => {
      if (!Number.isFinite(startIndex) || startIndex < 0 || startIndex >= sortedBags.length) return;
      const baseImpulse = clamp(impulse, -MAX_PROPAGATION_IMPULSE, MAX_PROPAGATION_IMPULSE);
      if (Math.abs(baseImpulse) < 0.3) return;

      applyImpulseToBag(sortedBags[startIndex], baseImpulse);

      for (let offset = 1; offset <= radius; offset += 1) {
        const attenuation = Math.pow(PROPAGATION_DECAY, offset);
        const leadIndex = startIndex - offset;
        const trailIndex = startIndex + offset;

        if (leadIndex >= 0) {
          applyImpulseToBag(sortedBags[leadIndex], baseImpulse * attenuation * 0.92);
        }

        if (trailIndex < sortedBags.length) {
          applyImpulseToBag(sortedBags[trailIndex], baseImpulse * attenuation * 0.66);
        }
      }
    };

    const visibleBeltIndices = (sortedBags) => {
      const indices = [];
      sortedBags.forEach((bag, index) => {
        if (bag.phase !== 'belt') return;
        if (bag.x + bag.width < -30) return;
        if (bag.x > spawnX + 30) return;
        indices.push(index);
      });
      return indices;
    };

    const triggerRandomBump = (sortedBags) => {
      const candidates = visibleBeltIndices(sortedBags);
      if (!candidates.length) return;

      const targetIndex = candidates[Math.floor(randomRange(0, candidates.length))];
      const impulse = random() < 0.68 ? randomRange(6, 18) : randomRange(-10, -4);
      propagateImpulse(sortedBags, targetIndex, impulse, 2);
    };

    const closestIndexToX = (sortedBags, x) => {
      if (!sortedBags.length) return -1;

      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      sortedBags.forEach((bag, index) => {
        const distance = Math.abs(bagCenterX(bag) - x);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });

      return bestIndex;
    };

    const startJam = (sortedBags) => {
      const candidates = visibleBeltIndices(sortedBags);
      if (candidates.length < 3) {
        jamState.timer = randomRange(2.5, 5);
        return;
      }

      const centerPool = candidates.slice(1, -1);
      const pickFrom = centerPool.length ? centerPool : candidates;
      const centerIndex = pickFrom[Math.floor(randomRange(0, pickFrom.length))];
      const centerBag = sortedBags[centerIndex];
      if (!centerBag) {
        jamState.timer = randomRange(2.5, 5);
        return;
      }

      jamState.phase = 'hold';
      jamState.timer = randomRange(JAM_HOLD_MIN_SECONDS, JAM_HOLD_MAX_SECONDS);
      jamState.centerX = clamp(bagCenterX(centerBag), 120, Math.max(240, spawnX - 140));
      jamState.radius = randomRange(180, 265);
      jamState.strength = randomRange(0.3, 0.48);
      jamState.releaseImpulse = randomRange(12, 22);
      track.dataset.baggageJam = 'true';
    };

    const startJamRelease = (sortedBags) => {
      jamState.phase = 'release';
      jamState.timer = randomRange(JAM_RELEASE_MIN_SECONDS, JAM_RELEASE_MAX_SECONDS);

      const centerIndex = closestIndexToX(sortedBags, jamState.centerX);
      if (centerIndex >= 0) {
        propagateImpulse(sortedBags, centerIndex, jamState.releaseImpulse, 3);
      }
    };

    const applyJamForces = (sortedBags, dt, releasing) => {
      for (const bag of sortedBags) {
        const distance = Math.abs(bagCenterX(bag) - jamState.centerX);
        if (distance > jamState.radius) continue;

        const influence = 1 - distance / jamState.radius;
        if (influence <= 0) continue;

        if (releasing) {
          const releaseTarget = bag.baseSpeed * (1 + influence * 0.2);
          bag.vx += (releaseTarget - bag.vx) * (4.4 + influence * 7.2) * dt;
          bag.vrot += signedNoise(bag.sequence + influence * 41) * 0.086 * influence;
        } else {
          const jamTarget = bag.baseSpeed * (1 - jamState.strength * influence);
          bag.vx += (jamTarget - bag.vx) * (6.8 + influence * 8.6) * dt;
          bag.vrot += signedNoise(bag.sequence + influence * 29) * 0.062 * influence;
        }

        bag.vx = clamp(bag.vx, BELT_SPEED_MIN, BELT_SPEED_MAX);
      }
    };


    const forceInjectCase = (sortedBags) => {
      if (!sortedBags.length) return;
      // Only recycle bags that are already off-screen left so visible cases never vanish.
      const candidatePool = sortedBags
        .filter((bag) => bag.phase === 'belt' && canRecycle(bag) && bag.x + bag.width < recycleX + 24)
        .sort((a, b) => a.x - b.x);
      const candidate = candidatePool[0];
      if (!candidate) return;

      let rightmostEdge = -Infinity;
      for (const bag of bags) rightmostEdge = Math.max(rightmostEdge, bag.x + bag.width);
      resetBagForSpawn(candidate, rightmostEdge, sortedBags);
    };

    const updateJamState = (sortedBags, dt) => {
      jamState.timer -= dt;

      if (jamState.phase === 'idle') {
        if (jamState.timer <= 0) {
          startJam(sortedBags);
        }
        return;
      }

      if (jamState.phase === 'hold') {
        applyJamForces(sortedBags, dt, false);
        if (jamState.timer <= 0) {
          startJamRelease(sortedBags);
        }
        return;
      }

      if (jamState.phase === 'release') {
        applyJamForces(sortedBags, dt, true);
        if (jamState.timer <= 0) {
          jamState.phase = 'idle';
          jamState.timer = randomRange(JAM_IDLE_MIN_SECONDS, JAM_IDLE_MAX_SECONDS);
          delete track.dataset.baggageJam;
        }
      }
    };

    const resetBagForSpawn = (bag, rightmostEdge, sortedBags) => {
      const sequence = recycleSequence;
      recycleSequence += 1;

      applyBagProfile(bag, sequence);

      const gap = BASE_GAP + signedNoise(sequence + 31) * GAP_JITTER;
      bag.vx = bag.baseSpeed * randomRange(0.58, 0.72);
      bag.vy = 0;
      bag.y = DROP_START_Y;
      bag.rot = signedNoise(sequence + 151) * 1.7;
      bag.vrot = signedNoise(sequence + 211) * 2;
      bag.phase = 'drop';

      const slotX = findSpawnSlotX(sortedBags, bag.width);
      const fallbackX = rightmostEdge + gap;
      bag.targetX = Number.isFinite(slotX) ? slotX : fallbackX;
      bag.chuteX = bag.targetX + randomRange(70, 170);
      bag.x = Math.max(bag.chuteX, spawnX - randomRange(8, 26));
      bag.prevX = bag.x;
      bag.prevY = bag.y;
      bag.prevRot = bag.rot;
    };

    const initializePositions = () => {
      applyTrackHeight();
      computeSpawnX();

      let cursor = -Math.min(80, bags[0].width * 0.25);
      bags.forEach((bag, index) => {
        const gap = BASE_GAP + signedNoise(index + 19) * GAP_JITTER;

        applyBagProfile(bag, index);
        bag.vx = bag.baseSpeed;
        bag.vy = 0;
        bag.y = 0;
        bag.rot = signedNoise(index + 89) * 0.35;
        bag.vrot = 0;
        bag.phase = 'belt';
        bag.x = cursor;
        bag.targetX = bag.x;
        bag.chuteX = bag.x;
        bag.prevX = bag.x;
        bag.prevY = bag.y;
        bag.prevRot = bag.rot;

        cursor += bag.width + gap;
      });

      render(1);
    };

    const canRecycle = (bag) => {
      const active = document.activeElement;
      if (!active || !(active instanceof HTMLElement)) return true;
      return active !== bag.el && !bag.el.contains(active);
    };

    const solveNeighborContacts = (sortedBags) => {
      for (let pass = 0; pass < CONTACT_SOLVER_PASSES; pass += 1) {
        for (let i = 0; i < sortedBags.length - 1; i += 1) {
          const frontBag = sortedBags[i];
          const rearBag = sortedBags[i + 1];

          if (frontBag.phase === 'drop' && frontBag.y < -6) continue;
          if (rearBag.phase === 'drop' && rearBag.y < -6) continue;

          const overlap = frontBag.x + frontBag.width + MIN_CONTACT_GAP - rearBag.x;
          if (overlap <= 0) continue;

          const totalMass = frontBag.mass + rearBag.mass;
          const frontShare = rearBag.mass / totalMass;
          const rearShare = frontBag.mass / totalMass;
          const correctionScale = pass === 0 ? 0.82 : 0.56;
          const resolvedOverlap = Math.min(CONTACT_CORRECTION_MAX, overlap);

          frontBag.x -= resolvedOverlap * frontShare * correctionScale;
          rearBag.x += resolvedOverlap * rearShare * correctionScale;

          const closingVelocity = rearBag.vx - frontBag.vx;
          if (closingVelocity > 0.16) {
            const transfer = closingVelocity * COLLISION_TRANSFER;
            frontBag.vx = clamp(frontBag.vx + transfer * frontShare, BELT_SPEED_MIN, BELT_SPEED_MAX);
            rearBag.vx = clamp(rearBag.vx - transfer * rearShare, BELT_SPEED_MIN, BELT_SPEED_MAX);
          }

          const bump = Math.min(2, resolvedOverlap * COLLISION_NUDGE);
          if (bump > 0.05) {
            frontBag.vy -= bump * 1.8;
            rearBag.vy -= bump * 1.1;
            frontBag.vrot -= bump * 0.042;
            rearBag.vrot += bump * 0.036;
          }
        }
      }
    };

    const step = (dt) => {
      for (const bag of bags) {
        bag.prevX = bag.x;
        bag.prevY = bag.y;
        bag.prevRot = bag.rot;
        bag.vx += (bag.baseSpeed - bag.vx) * SPEED_CONVERGENCE * dt;
        bag.vx = clamp(bag.vx, BELT_SPEED_MIN, BELT_SPEED_MAX);
      }

      const sortedBags = listSortedBags();

      randomBumpTimer -= dt;
      if (randomBumpTimer <= 0) {
        triggerRandomBump(sortedBags);
        randomBumpTimer = randomRange(RANDOM_BUMP_MIN_SECONDS, RANDOM_BUMP_MAX_SECONDS);
      }

      updateJamState(sortedBags, dt);

      caseInjectTimer -= dt;
      if (caseInjectTimer <= 0) {
        forceInjectCase(sortedBags);
        caseInjectTimer = randomRange(CASE_INJECT_MIN_SECONDS, CASE_INJECT_MAX_SECONDS);
      }

      for (const bag of bags) {
        if (bag.phase === 'drop') {
          bag.x += (bag.targetX - bag.x) * Math.min(1, 4.8 * dt);
          bag.vy += GRAVITY * dt;
          bag.y += bag.vy * dt;
          bag.rot += bag.vrot * dt;
          bag.vrot *= Math.max(0, 1 - 5.3 * dt);

          if (bag.y >= 0) {
            bag.y = 0;
            if (Math.abs(bag.vy) < 40) {
              bag.vy = 0;
              bag.vrot = 0;
              bag.phase = 'belt';
              bag.targetX = bag.x;
            } else {
              bag.vy = -bag.vy * LANDING_BOUNCE;
              bag.vrot += signedNoise(bag.sequence + 317) * 0.58;
            }
          }
        } else {
          bag.x -= bag.vx * dt;
          bag.vy += GRAVITY * 0.2 * dt;
          bag.y += bag.vy * dt;
          bag.y += (0 - bag.y) * Math.min(1, 12.5 * dt);
          bag.vy *= Math.max(0, 1 - 7.2 * dt);

          bag.rot += bag.vrot * dt;
          bag.vrot *= Math.max(0, 1 - 7.8 * dt);
          bag.rot += (0 - bag.rot) * Math.min(1, 7.4 * dt);
        }

        bag.y = clamp(bag.y, -14, 10);
        bag.rot = clamp(bag.rot, -MAX_ROTATION, MAX_ROTATION);
      }

      const postMoveSorted = listSortedBags();
      solveNeighborContacts(postMoveSorted);

      let rightmostEdge = -Infinity;
      for (const bag of bags) {
        rightmostEdge = Math.max(rightmostEdge, bag.x + bag.width);
      }

      for (const bag of bags) {
        if (bag.x + bag.width < recycleX && canRecycle(bag)) {
          resetBagForSpawn(bag, rightmostEdge, postMoveSorted);
          rightmostEdge = Math.max(rightmostEdge, bag.x + bag.width);
        }
      }
    };

    const render = (alpha = 1) => {
      const blend = clamp(alpha, 0, 1);
      for (const bag of bags) {
        const x = bag.prevX + (bag.x - bag.prevX) * blend;
        const y = bag.prevY + (bag.y - bag.prevY) * blend;
        const rot = bag.prevRot + (bag.rot - bag.prevRot) * blend;
        bag.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg)`;
      }
    };

    const frame = (timestamp) => {
      if (!running) return;

      if (!lastTimestamp) lastTimestamp = timestamp;
      const elapsed = Math.min(MAX_FRAME_SECONDS, (timestamp - lastTimestamp) / 1000);
      lastTimestamp = timestamp;
      accumulator += elapsed;

      while (accumulator >= STEP_SECONDS) {
        step(STEP_SECONDS);
        accumulator -= STEP_SECONDS;
      }

      render(accumulator / STEP_SECONDS);
      rafId = window.requestAnimationFrame(frame);
    };

    const updateRunningState = () => {
      const shouldRun = inViewport && !hidden;
      if (shouldRun === running) return;

      running = shouldRun;
      if (running) {
        accumulator = 0;
        lastTimestamp = 0;
        rafId = window.requestAnimationFrame(frame);
      } else if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const handleVisibility = () => {
      hidden = document.hidden;
      updateRunningState();
    };

    let resizeTimer = null;
    const handleResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        computeSpawnX();
        bags.forEach((bag) => {
          const rect = bag.el.getBoundingClientRect();
          bag.width = Math.max(220, rect.width || bag.el.offsetWidth || 292);
          bag.height = Math.max(140, rect.height || bag.el.offsetHeight || 168);
          bag.prevX = bag.x;
          bag.prevY = bag.y;
          bag.prevRot = bag.rot;
        });
        applyTrackHeight();
      }, 140);
    };

    initializePositions();
    recycleX = -RECYCLE_MARGIN;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        inViewport = Boolean(entry?.isIntersecting && entry.intersectionRatio > 0.02);
        updateRunningState();
      },
      { threshold: [0, 0.02, 0.1] }
    );

    observer.observe(marquee);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('resize', handleResize, { passive: true });

    updateRunningState();
  };
  initHeroBaggageLoop();

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

  // Hero hand pull-down reveal (page-load intro + scroll sync)
  const heroSection = document.querySelector('.hero');
  if (heroSection) {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const easeOutCubic = (v) => 1 - Math.pow(1 - v, 3);

    const applyHeroProgress = (progressRaw) => {
      const progress = prefersReduced ? 1 : clamp01(progressRaw);
      const eased = prefersReduced ? 1 : easeOutCubic(progress);

      const copyRise = (1 - eased) * 22;
      const copyShift = window.innerWidth > 900 ? (1 - eased) * 18 : 0;
      const handLift = (1 - eased) * 190;
      const handTilt = (1 - eased) * 10;

      heroSection.style.setProperty('--hero-open-progress', eased.toFixed(4));
      heroSection.style.setProperty('--hero-copy-rise', `${copyRise.toFixed(2)}px`);
      heroSection.style.setProperty('--hero-copy-shift', `${copyShift.toFixed(2)}px`);
      heroSection.style.setProperty('--hero-hand-lift', `${handLift.toFixed(2)}px`);
      heroSection.style.setProperty('--hero-hand-tilt', `${handTilt.toFixed(2)}deg`);
    };

    const computeScrollProgress = () => {
      const rect = heroSection.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const start = viewport * 0.92;
      const end = Math.max(viewport * 0.18, rect.height * 0.64);
      const raw = (start - rect.top) / Math.max(1, start - end);
      return clamp01(raw);
    };

    let introDone = false;
    let handTicking = false;

    const onHeroScroll = () => {
      if (!introDone) return;
      if (handTicking) return;
      handTicking = true;
      window.requestAnimationFrame(() => {
        applyHeroProgress(computeScrollProgress());
        handTicking = false;
      });
    };

    const runIntro = () => {
      // Even with reduced motion, keep a very light reveal so this doesn't look broken.
      const duration = prefersReduced ? 260 : 1700;
      const delay = prefersReduced ? 0 : 260;
      const started = performance.now() + delay;

      const tick = (now) => {
        const t = clamp01((now - started) / duration);
        applyHeroProgress(t);
        if (t < 1) {
          window.requestAnimationFrame(tick);
          return;
        }
        introDone = true;
      };

      introDone = false;
      applyHeroProgress(0);
      window.requestAnimationFrame(tick);
    };

    window.addEventListener('scroll', onHeroScroll, { passive: true });
    window.addEventListener('resize', onHeroScroll, { passive: true });

    // iOS Safari can paint before JS timings settle; trigger intro after page show/load.
    const bootIntro = () => window.setTimeout(runIntro, 80);
    if (document.readyState === 'complete') {
      bootIntro();
    } else {
      window.addEventListener('load', bootIntro, { once: true });
    }
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) bootIntro();
    });
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

  // Hidden Retro Arcade architecture now lives in dedicated modules.
  // app.js only boots the controller and forwards theme changes.
  if (window.ChaseArcade && typeof window.ChaseArcade.init === 'function') {
    arcadeController = window.ChaseArcade.init({ siteRoot: root });
    scheduleArcadeThemeSync(root.dataset.theme || 'default', document.getElementById('themeStylesheet'));
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
