(() => {
  const root = document.documentElement;

  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  const updatedEl = document.getElementById('updated');
  if (updatedEl) {
    updatedEl.textContent = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  }

  // Arc theme toggle (localStorage is best-effort; it can be blocked in some contexts)
  const ARC_KEY = 'cc_style_arc';
  const arcBtn = document.getElementById('arcToggle');
  let savedArc = null;
  try {
    savedArc = localStorage.getItem(ARC_KEY);
  } catch (e) {}

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

      try {
        localStorage.setItem(ARC_KEY, next ? 'true' : 'false');
      } catch (e) {}

      sync();
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
