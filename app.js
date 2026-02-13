(() => {
  const root = document.documentElement;
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Footer year
  const y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());

  // Simple “updated” text
  const upd = document.getElementById('updated');
  if (upd) {
    const d = new Date();
    upd.textContent = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  }

  // Theme toggle (Apple-clean: light first, but remembers preference)
  const THEME_KEY = 'cc_theme';
  const themeBtn = document.getElementById('themeToggle');
  const icon = document.getElementById('themeIcon');

  function applyTheme(theme) {
    if (theme === 'dark') root.dataset.theme = 'dark';
    else delete root.dataset.theme;

    if (icon) icon.textContent = theme === 'dark' ? '●' : '◐';
    if (themeBtn) themeBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'dark') applyTheme('dark');
  else applyTheme('light');

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isDark = root.dataset.theme === 'dark';
      const next = isDark ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
  }

  // Reduce motion toggle
  const MOTION_KEY = 'cc_reduce_motion';
  const motionBtn = document.getElementById('motionToggle');
  const savedMotion = localStorage.getItem(MOTION_KEY);
  if (savedMotion === 'true') root.dataset.reduceMotion = 'true';

  if (motionBtn) {
    motionBtn.setAttribute('aria-pressed', root.dataset.reduceMotion === 'true' ? 'true' : 'false');
    motionBtn.addEventListener('click', () => {
      const next = root.dataset.reduceMotion !== 'true';
      root.dataset.reduceMotion = next ? 'true' : 'false';
      localStorage.setItem(MOTION_KEY, next ? 'true' : 'false');
      motionBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
    });
  }

  // Reveal-on-scroll (subtle, Apple-like)
  const reduce = prefersReduced || root.dataset.reduceMotion === 'true';
  const nodes = Array.from(document.querySelectorAll('[data-reveal]'));
  if (!nodes.length) return;

  if (reduce || !('IntersectionObserver' in window)) {
    nodes.forEach((n) => n.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
  );

  nodes.forEach((n) => io.observe(n));
})();
