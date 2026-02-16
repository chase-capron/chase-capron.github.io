(() => {
  const THEME_KEY = 'cc_theme';
  const LEGACY_ARC_KEY = 'cc_style_arc';

  const sanitizeThemeId = (value) => {
    const candidate = String(value || '').toLowerCase();
    return /^[a-z0-9-]+$/.test(candidate) ? candidate : 'default';
  };

  try {
    const stored = sanitizeThemeId(localStorage.getItem(THEME_KEY));
    const legacyArc = localStorage.getItem(LEGACY_ARC_KEY) === 'true';
    const initialTheme = stored !== 'default' ? stored : legacyArc ? 'arc' : 'default';

    if (initialTheme !== 'default') {
      document.documentElement.dataset.theme = initialTheme;
    }
  } catch (e) {
    // Keep default theme when storage is unavailable.
  }
})();
