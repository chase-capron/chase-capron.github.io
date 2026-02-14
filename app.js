(() => {
  const root = document.documentElement;
  const yearEl = document.getElementById('year');
  const updatedEl = document.getElementById('updated');
  const motionBtn = document.getElementById('motionToggle');
  const revealNodes = Array.from(document.querySelectorAll('[data-reveal]'));
  const parallaxNodes = Array.from(document.querySelectorAll('[data-parallax]')).map((node) => ({
    node,
    speed: Number(node.dataset.speed || 0),
  }));

  yearEl.textContent = String(new Date().getFullYear());
  updatedEl.textContent = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'cc_reduce_motion';

  revealNodes.forEach((node) => {
    const delay = Number(node.dataset.delay || 0);
    node.style.setProperty('--reveal-delay', `${delay}ms`);
  });

  const updateParallax = () => {
    if (root.dataset.reduceMotion === 'true') return;

    const y = window.scrollY;
    parallaxNodes.forEach(({ node, speed }) => {
      node.style.transform = `translate3d(0, ${y * speed}px, 0)`;
    });
  };

  const setReduce = (enabled) => {
    root.dataset.reduceMotion = enabled ? 'true' : 'false';
    localStorage.setItem(KEY, enabled ? 'true' : 'false');

    if (motionBtn) {
      motionBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    }

    if (enabled) {
      revealNodes.forEach((node) => node.classList.add('is-in'));
      parallaxNodes.forEach(({ node }) => {
        node.style.transform = 'none';
      });
    } else {
      updateParallax();
    }
  };

  const savedMotion = localStorage.getItem(KEY);
  const reduceMotion = prefersReduced || savedMotion === 'true';
  setReduce(reduceMotion);

  if (motionBtn) {
    motionBtn.addEventListener('click', () => {
      const next = root.dataset.reduceMotion !== 'true';
      setReduce(next);
    });
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateParallax();
      ticking = false;
    });
  };

  updateParallax();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (root.dataset.reduceMotion === 'true' || !('IntersectionObserver' in window)) {
    revealNodes.forEach((node) => node.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -14% 0px',
  });

  revealNodes.forEach((node) => io.observe(node));
})();
