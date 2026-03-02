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

    const apply = (themeId) => {
      const safeTheme = normalizeTheme(themeId);
      shellRoot.dataset.arcadeTheme = safeTheme;

      const styles = getComputedStyle(root);
      setToken('--arcade-accent', styles.getPropertyValue('--accent').trim(), '#2f83ff');
      setToken('--arcade-line', styles.getPropertyValue('--line').trim(), 'rgba(255, 255, 255, 0.16)');
      setToken('--arcade-surface', styles.getPropertyValue('--surface').trim(), '#0a1020');
      setToken('--arcade-text', styles.getPropertyValue('--text').trim(), '#f3f6ff');
      setToken('--arcade-text-soft', styles.getPropertyValue('--text-soft').trim(), 'rgba(243, 246, 255, 0.82)');
    };

    const destroy = () => {
      delete shellRoot.dataset.arcadeTheme;
      shellRoot.style.removeProperty('--arcade-accent');
      shellRoot.style.removeProperty('--arcade-line');
      shellRoot.style.removeProperty('--arcade-surface');
      shellRoot.style.removeProperty('--arcade-text');
      shellRoot.style.removeProperty('--arcade-text-soft');
    };

    return {
      apply,
      destroy,
    };
  };
})();
