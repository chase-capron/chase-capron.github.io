(() => {
  const THEME_KEY = 'cc_theme';
  const LEGACY_ARC_KEY = 'cc_style_arc';
  const THEME_REGISTRY_VERSION = '2';

  const themeStylesById = {
    apple: 'themes/presets/apple.css',
    default: 'themes/presets/default.css',
    matrix: 'themes/presets/matrix.css',
    'classic-mac': 'themes/presets/classic-mac.css',
    simpsons: 'themes/presets/simpsons.css',
  };

  const sanitizeThemeId = (value) => {
    const candidate = String(value || '').toLowerCase();
    return /^[a-z0-9-]+$/.test(candidate) ? candidate : 'default';
  };

  const readStoredTheme = () => {
    try {
      const raw = localStorage.getItem(THEME_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (String(parsed.registryVersion || '') !== THEME_REGISTRY_VERSION) {
        localStorage.removeItem(THEME_KEY);
        localStorage.removeItem(LEGACY_ARC_KEY);
        return null;
      }

      const themeId = sanitizeThemeId(parsed.themeId);
      return Object.prototype.hasOwnProperty.call(themeStylesById, themeId) ? themeId : null;
    } catch (e) {
      try {
        localStorage.removeItem(THEME_KEY);
      } catch (storageError) {}
      return null;
    }
  };

  const resolveAssetUrl = (assetPath) => {
    const candidate = String(assetPath || '').trim();
    if (!candidate) return '';

    const script =
      document.currentScript ||
      document.querySelector('script[src*="/theme-init.js"]') ||
      document.querySelector('script[src*="theme-init.js"]');
    const base = script?.src ? new URL('.', script.src).toString() : `${window.location.origin}/`;

    try {
      return new URL(candidate, base).toString();
    } catch (e) {
      return candidate;
    }
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

  try {
    const stored = readStoredTheme();
    const initialTheme = stored || 'default';

    if (initialTheme !== 'default') {
      document.documentElement.dataset.theme = initialTheme;
    }

    const href = resolveAssetUrl(themeStylesById[initialTheme] || themeStylesById.default);
    if (href) {
      const link = ensureThemeStylesheet();
      if (link.getAttribute('href') !== href) {
        link.setAttribute('href', href);
      }
    }
  } catch (e) {
    // Keep default theme when storage is unavailable.
  }
})();
