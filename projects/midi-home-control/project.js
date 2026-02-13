(() => {
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  if (!lightbox || !img) return;

  function open(src, alt) {
    img.src = src;
    img.alt = alt || 'Screenshot';
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lightbox.setAttribute('aria-hidden', 'true');
    img.src = '';
    document.body.style.overflow = '';
  }

  document.addEventListener('click', (e) => {
    const shot = e.target.closest && e.target.closest('[data-shot]');
    if (shot) {
      const src = shot.getAttribute('data-shot');
      const im = shot.querySelector('img');
      open(src, im ? im.alt : 'Screenshot');
      return;
    }

    if (e.target && e.target.matches && (e.target.matches('[data-close]') || e.target.closest('[data-close]'))) {
      close();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
})();
