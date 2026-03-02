(() => {
  const ns = (window.ChaseArcade = window.ChaseArcade || {});

  const normalizeTheme = (value) => {
    const candidate = String(value || '').trim().toLowerCase();
    return /^[a-z0-9-]+$/.test(candidate) ? candidate : 'default';
  };

  ns.createThemeAdapter = ({ siteRoot, shellRoot } = {}) => {
    if (!shellRoot) {
      return {
        apply: () => {},
        destroy: () => {},
      };
    }

    const root = siteRoot instanceof HTMLElement ? siteRoot : document.documentElement;

    const setToken = (name, value, fallback = '') => {
      shellRoot.style.setProperty(name, value || fallback);
    };

    const readToken = (styles, name, fallback = '') => {
      return styles.getPropertyValue(name).trim() || fallback;
    };

    const apply = (themeId) => {
      const safeTheme = normalizeTheme(themeId);
      shellRoot.dataset.arcadeTheme = safeTheme;

      const styles = getComputedStyle(root);
      const accent = readToken(styles, '--accent', '#2f83ff');
      const line = readToken(styles, '--line', 'rgba(255, 255, 255, 0.16)');
      const surface = readToken(styles, '--surface', '#0a1020');
      const surfaceSolid = readToken(styles, '--surface-solid', surface);
      const text = readToken(styles, '--text', '#f3f6ff');
      const textSoft = readToken(styles, '--text-soft', 'rgba(243, 246, 255, 0.82)');
      const bg = readToken(styles, '--bg', '#050814');

      setToken('--arcade-accent', accent);
      setToken('--arcade-line', line);
      setToken('--arcade-surface', surface);
      setToken('--arcade-text', text);
      setToken('--arcade-text-soft', textSoft);

      setToken('--hh-accent', accent);
      setToken('--hh-shell-hi', surfaceSolid);
      setToken('--hh-shell-lo', surface);
      setToken('--hh-glow', accent);
      setToken('--hh-screen-tint', bg);
    };

    const destroy = () => {
      delete shellRoot.dataset.arcadeTheme;
      [
        '--arcade-accent',
        '--arcade-line',
        '--arcade-surface',
        '--arcade-text',
        '--arcade-text-soft',
        '--hh-accent',
        '--hh-shell-hi',
        '--hh-shell-lo',
        '--hh-glow',
        '--hh-screen-tint',
      ].forEach((token) => shellRoot.style.removeProperty(token));
    };

    return {
      apply,
      destroy,
    };
  };
})();
