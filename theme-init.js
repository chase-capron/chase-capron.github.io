(() => {
  const THEME_KEY = 'cc_theme';
  const LEGACY_ARC_KEY = 'cc_style_arc';
  const THEME_REGISTRY_VERSION = '2';
  const ASSET_VERSION = '20261025';
  const FALLBACK_THEME = 'matrix';

  const themeStylesById = {
    apple: 'themes/presets/apple.css',
    default: 'themes/presets/default.css',
    matrix: 'themes/presets/matrix.css',
    'classic-mac': 'themes/presets/classic-mac.css',
    simpsons: 'themes/presets/simpsons.css',
    synthwave: 'themes/presets/synthwave.css',
    nord: 'themes/presets/nord.css',
  };

  const themeColorById = {
    default: '#07111f',
    apple: '#f5f5f7',
    'classic-mac': '#bdbdbd',
    matrix: '#04110a',
    simpsons: '#70c6ff',
    synthwave: '#14081f',
    nord: '#2e3440',
  };

  const lightThemes = new Set(['apple', 'classic-mac', 'simpsons']);

  const sanitizeThemeId = (value) => {
    const candidate = String(value || '').toLowerCase();
    return /^[a-z0-9-]+$/.test(candidate) ? candidate : FALLBACK_THEME;
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

  const withVersion = (url) => {
    if (!url) return url;
    const joiner = url.includes('?') ? '&' : '?';
    return `${url}${joiner}v=${ASSET_VERSION}`;
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

  const paintThemeChrome = (themeId) => {
    const color = themeColorById[themeId] || themeColorById[FALLBACK_THEME];
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta && color) themeMeta.setAttribute('content', color);
    const schemeMeta = document.querySelector('meta[name="color-scheme"]');
    if (schemeMeta) schemeMeta.setAttribute('content', lightThemes.has(themeId) ? 'light' : 'dark');
  };

  try {
    const stored = readStoredTheme();
    const initialTheme = stored || FALLBACK_THEME;

    document.documentElement.dataset.theme = initialTheme;
    paintThemeChrome(initialTheme);

    const href = withVersion(resolveAssetUrl(themeStylesById[initialTheme] || themeStylesById[FALLBACK_THEME]));
    if (href) {
      const link = ensureThemeStylesheet();
      if (link.getAttribute('href') !== href) {
        link.setAttribute('href', href);
      }
    }
  } catch (e) {
    // Keep the Matrix theme when storage is unavailable.
  }
})();
