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
