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
