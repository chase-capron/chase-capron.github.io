(() => {
  const ns = (window.ChaseArcade = window.ChaseArcade || {});

  ns.createTapUnlockTrigger = ({
    element,
    requiredTaps = 10,
    timeoutMs = 6000,
    onProgress,
    onUnlock,
  } = {}) => {
    if (!(element instanceof HTMLElement)) {
      return {
        destroy: () => {},
      };
    }

    const tapsRequired = Math.max(2, Number(requiredTaps) || 10);
    const windowMs = Math.max(1000, Number(timeoutMs) || 6000);

    let taps = 0;
    let timer = null;

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
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
      emitProgress();
    };

    const handleClick = (event) => {
      event.preventDefault();

      taps += 1;
      emitProgress();

      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        reset();
      }, windowMs);

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
