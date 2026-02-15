(() => {
  const root = document.documentElement;
  const yearEl = document.getElementById('year');
  const updatedEl = document.getElementById('updated');
  const revealNodes = Array.from(document.querySelectorAll('[data-reveal]'));

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  if (updatedEl) {
    updatedEl.textContent = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  }

  revealNodes.forEach((node) => {
    const delay = Number(node.dataset.delay || 0);
    node.style.setProperty('--reveal-delay', `${delay}ms`);
  });

  if (!('IntersectionObserver' in window)) {
    revealNodes.forEach((node) => node.classList.add('is-in'));
    return;
  }

  // Arc theme toggle
  const ARC_KEY = 'cc_style_arc';
  const arcBtn = document.getElementById('arcToggle');
  const savedArc = localStorage.getItem(ARC_KEY);
  if (savedArc === 'true') root.dataset.style = 'arc';

  if (arcBtn) {
    const sync = () => {
      const on = root.dataset.style === 'arc';
      arcBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      arcBtn.textContent = on ? 'Arc: On' : 'Arc';
    };

    sync();
    arcBtn.addEventListener('click', () => {
      const next = root.dataset.style !== 'arc';
      if (next) root.dataset.style = 'arc';
      else delete root.dataset.style;
      localStorage.setItem(ARC_KEY, next ? 'true' : 'false');
      sync();
    });
  }

  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.1,
  });

  revealNodes.forEach((node) => io.observe(node));
})();
