(() => {
  const ns = (window.ChaseArcade = window.ChaseArcade || {});

  ns.createTapUnlockTrigger = ({
    element,
    requiredTaps = 10,
    timeoutMs = 6000,
    interTapMs,
    onProgress,
    onUnlock,
  } = {}) => {
    if (!(element instanceof HTMLElement)) {
      return {
        destroy: () => {},
      };
    }

    const tapsRequired = Math.max(2, Number(requiredTaps) || 10);
    const windowMs = Math.max(1200, Number(timeoutMs) || 6000);
    const maxInterTapMs = Math.max(
      250,
      Math.min(1200, Number(interTapMs) || Math.round(windowMs / tapsRequired))
    );

    let taps = 0;
    let sequenceTimer = null;
    let idleTimer = null;
    let lastEvent = null;

    const getAnchor = () => {
      if (element instanceof HTMLAnchorElement) return element;
      return element.closest?.('a[href]') || null;
    };

    const fallbackNavigate = () => {
      const anchor = getAnchor();
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const hrefAttr = String(anchor.getAttribute('href') || '').trim();
      if (!hrefAttr) return;

      const href = anchor.href;
      if (!href) return;

      if (anchor.target && anchor.target !== '_self') {
        window.open(href, anchor.target);
        return;
      }

      window.location.assign(href);
    };

    const clearTimers = () => {
      if (sequenceTimer) {
        window.clearTimeout(sequenceTimer);
        sequenceTimer = null;
      }
      if (idleTimer) {
        window.clearTimeout(idleTimer);
        idleTimer = null;
      }
    };

    const emitProgress = () => {
      if (typeof onProgress !== 'function') return;
      onProgress({
        taps,
        tapsRequired,
        remaining: Math.max(0, tapsRequired - taps),
      });
    };

    const reset = () => {
      taps = 0;
      lastEvent = null;
      clearTimers();
      emitProgress();
    };

    const startWindowTimer = () => {
      if (sequenceTimer) return;
      sequenceTimer = window.setTimeout(() => {
        reset();
      }, windowMs);
    };

    const restartIdleTimer = () => {
      if (idleTimer) {
        window.clearTimeout(idleTimer);
      }

      idleTimer = window.setTimeout(() => {
        const shouldNavigate = taps === 1;
        reset();
        if (shouldNavigate) fallbackNavigate();
      }, maxInterTapMs);
    };

    const handleClick = (event) => {
      event.preventDefault();
      lastEvent = event;

      taps += 1;
      emitProgress();
      startWindowTimer();
      restartIdleTimer();

      if (taps < tapsRequired) return;

      reset();
      if (typeof onUnlock === 'function') {
        onUnlock({ event, tapsRequired });
      }
    };

    element.addEventListener('click', handleClick);

    return {
      destroy: () => {
        element.removeEventListener('click', handleClick);
        reset();
      },
    };
  };
})();
