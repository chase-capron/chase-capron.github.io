(() => {
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const motionBtn = document.getElementById('motionToggle');

  // Footer year
  const y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());

  // Simple interactive tilt on cards (very lightweight)
  const cards = Array.from(document.querySelectorAll('[data-tilt]'));
  const maxTilt = 7; // degrees

  function setTransform(el, rx, ry) {
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  }

  function bindTilt(el) {
    function onMove(e) {
      if (root.dataset.reduceMotion === 'true' || prefersReduced) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const ry = (px - 0.5) * (maxTilt * 2);
      const rx = (0.5 - py) * (maxTilt * 2);
      setTransform(el, rx.toFixed(2), ry.toFixed(2));
      el.style.borderColor = 'rgba(255,140,0,.22)';
      el.style.background = 'rgba(18,26,38,.72)';
    }

    function onLeave() {
      setTransform(el, 0, 0);
      el.style.borderColor = 'rgba(255,255,255,.12)';
      el.style.background = 'rgba(18,26,38,.60)';
    }

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('blur', onLeave);
  }

  cards.forEach(bindTilt);

  // Reduce motion toggle (persists)
  const KEY = 'cc_reduce_motion';
  const saved = localStorage.getItem(KEY);
  if (saved === 'true') root.dataset.reduceMotion = 'true';
  if (motionBtn) {
    motionBtn.setAttribute('aria-pressed', root.dataset.reduceMotion === 'true' ? 'true' : 'false');

    motionBtn.addEventListener('click', () => {
      const next = root.dataset.reduceMotion !== 'true';
      root.dataset.reduceMotion = next ? 'true' : 'false';
      localStorage.setItem(KEY, next ? 'true' : 'false');
      motionBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
      // reset any active transforms
      cards.forEach((c) => setTransform(c, 0, 0));
    });
  }
})();
