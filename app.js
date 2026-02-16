(() => {
  const root = document.documentElement;

  const THEME_KEY = 'cc_theme';
  const LEGACY_ARC_KEY = 'cc_style_arc';
  const themeSelect = document.getElementById('themeSelect');
  const allowedThemes = new Set(['default', 'arc']);

  const getStoredTheme = () => {
    try {
      const explicit = localStorage.getItem(THEME_KEY);
      if (explicit && allowedThemes.has(explicit)) return explicit;

      // Migration path for existing users.
      if (localStorage.getItem(LEGACY_ARC_KEY) === 'true') return 'arc';
    } catch (e) {}

    return 'default';
  };

  const applyTheme = (theme) => {
    const nextTheme = allowedThemes.has(theme) ? theme : 'default';

    if (nextTheme === 'default') {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = nextTheme;
    }

    if (themeSelect) {
      themeSelect.value = nextTheme;
    }

    try {
      localStorage.setItem(THEME_KEY, nextTheme);
      localStorage.setItem(LEGACY_ARC_KEY, nextTheme === 'arc' ? 'true' : 'false');
    } catch (e) {}
  };

  const firstTheme = root.dataset.theme || getStoredTheme();
  applyTheme(firstTheme);

  if (themeSelect) {
    themeSelect.addEventListener('change', (event) => {
      applyTheme(event.target.value);
    });
  }

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
