(() => {
  const THEME_KEY = 'cc_theme';
  const LEGACY_ARC_KEY = 'cc_style_arc';

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
    const rawStored = localStorage.getItem(THEME_KEY);
    const stored = rawStored === null ? null : sanitizeThemeId(rawStored);
    const legacyArc = localStorage.getItem(LEGACY_ARC_KEY) === 'true';
    const preferred = stored || (legacyArc ? 'matrix' : 'apple');
    const initialTheme = Object.prototype.hasOwnProperty.call(themeStylesById, preferred) ? preferred : 'apple';

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
