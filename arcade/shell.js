(() => {
  const ns = (window.ChaseArcade = window.ChaseArcade || {});

  ns.createShellController = ({
    root,
    initialTab = 'pong',
    onOpen,
    onClose,
    onTabChange,
  } = {}) => {
    if (!(root instanceof HTMLElement)) {
      return {
        open: () => {},
        close: () => {},
        setTab: () => false,
        isOpen: () => false,
        currentTab: () => 'pong',
        destroy: () => {},
      };
    }

    const panel = root.querySelector('.arcade-shell__panel');
    const tabs = Array.from(root.querySelectorAll('[data-arcade-tab]'));
    const panes = Array.from(root.querySelectorAll('[data-arcade-pane]'));
    const closers = Array.from(root.querySelectorAll('[data-arcade-close]'));
    const closeButton = root.querySelector('.arcade-shell__close');

    const PHASE = {
      CLOSED: 'closed',
      OPENING: 'opening',
      OPEN: 'open',
      SWITCHING: 'switching',
      CLOSING: 'closing',
    };

    const MOTION = {
      full: {
        openMs: 220,
        closeMs: 180,
        powerDownMs: 90,
        cartridgeMs: 120,
        warmMs: 140,
      },
      reduced: {
        openMs: 120,
        closeMs: 100,
        crossfadeMs: 110,
      },
    };

    let activeTab = String(initialTab || '').trim() || 'pong';
    let phase = PHASE.CLOSED;
    let previousFocus = null;
    let transitionToken = 0;
    let queuedSwitch = null;

    const pendingTimers = new Set();

    const reduceMotionQuery =
      typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

    let prefersReducedMotion = Boolean(reduceMotionQuery?.matches);

    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const nextToken = () => {
      transitionToken += 1;
      return transitionToken;
    };

    const withTimer = (callback, delayMs) => {
      const id = window.setTimeout(() => {
        pendingTimers.delete(id);
        callback();
      }, Math.max(0, Number(delayMs) || 0));

      pendingTimers.add(id);
      return id;
    };

    const clearTimers = () => {
      pendingTimers.forEach((id) => window.clearTimeout(id));
      pendingTimers.clear();
    };

    const setPhase = (nextPhase) => {
      phase = nextPhase;

      root.dataset.arcadePhase = nextPhase;
      root.classList.toggle('is-opening', nextPhase === PHASE.OPENING);
      root.classList.toggle('is-switching', nextPhase === PHASE.SWITCHING);
      root.classList.toggle('is-closing', nextPhase === PHASE.CLOSING);
    };

    const getMotion = () => (prefersReducedMotion ? MOTION.reduced : MOTION.full);

    const syncMotionAttrs = () => {
      const motion = getMotion();

      root.style.setProperty('--arcade-open-ms', `${motion.openMs}ms`);
      root.style.setProperty('--arcade-close-ms', `${motion.closeMs}ms`);
      root.style.setProperty('--arcade-switch-powerdown-ms', `${motion.powerDownMs || 0}ms`);
      root.style.setProperty('--arcade-switch-cartridge-ms', `${motion.cartridgeMs || 0}ms`);
      root.style.setProperty('--arcade-switch-warm-ms', `${motion.warmMs || 0}ms`);
      root.style.setProperty('--arcade-switch-crossfade-ms', `${motion.crossfadeMs || 0}ms`);
    };

    const safeTab = (id) => {
      const candidate = String(id || '').trim();
      return tabs.some((tab) => tab.dataset.arcadeTab === candidate)
        ? candidate
        : tabs[0]?.dataset.arcadeTab || 'pong';
    };

    const getFocusable = () => {
      if (!(panel instanceof HTMLElement)) return [];
      return Array.from(panel.querySelectorAll(focusableSelector)).filter((node) => {
        if (!(node instanceof HTMLElement)) return false;
        if (node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true') return false;
        if (node.hasAttribute('disabled')) return false;
        if (node.offsetParent === null && node !== document.activeElement) return false;
        return true;
      });
    };

    const focusCurrentTab = () => {
      const active = tabs.find((tab) => tab.dataset.arcadeTab === activeTab);
      if (active) {
        active.focus();
        return;
      }
      closeButton?.focus();
    };

    const setTabsBusy = (busy) => {
      tabs.forEach((tab) => {
        tab.toggleAttribute('disabled', Boolean(busy));
        tab.setAttribute('aria-disabled', busy ? 'true' : 'false');
      });
    };

    const clearSwitchClasses = () => {
      root.removeAttribute('data-arcade-switch-phase');
      root.removeAttribute('data-arcade-switch-to');
      tabs.forEach((tab) => tab.classList.remove('is-target'));
    };

    const applyTabState = (id, { focusTab = false } = {}) => {
      const nextTab = safeTab(id);
      activeTab = nextTab;

      tabs.forEach((tab) => {
        const isActive = tab.dataset.arcadeTab === nextTab;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        tab.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      panes.forEach((pane) => {
        const isActive = pane.dataset.arcadePane === nextTab;
        pane.classList.toggle('is-active', isActive);
        pane.toggleAttribute('hidden', !isActive);
        pane.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      });

      if (focusTab) {
        focusCurrentTab();
      }

      return nextTab;
    };

    const notifyTabChange = (tabId, shouldNotify) => {
      if (shouldNotify && typeof onTabChange === 'function') {
        onTabChange(tabId);
      }
    };

    const flushQueuedSwitch = () => {
      if (!queuedSwitch || phase !== PHASE.OPEN) return;
      const next = queuedSwitch;
      queuedSwitch = null;
      setTab(next.id, { notify: next.notify, focusTab: next.focusTab });
    };

    const runSwitch = (targetTab, { notify = true, focusTab = false } = {}) => {
      const nextTab = safeTab(targetTab);
      const motion = getMotion();
      const token = nextToken();

      setPhase(PHASE.SWITCHING);
      setTabsBusy(true);

      root.dataset.arcadeSwitchTo = nextTab;
      tabs.forEach((tab) => tab.classList.toggle('is-target', tab.dataset.arcadeTab === nextTab));

      const completeSwitch = () => {
        if (token !== transitionToken) return;
        clearSwitchClasses();
        setTabsBusy(false);
        setPhase(PHASE.OPEN);
        if (focusTab) {
          focusCurrentTab();
        }
        notifyTabChange(nextTab, notify);
        flushQueuedSwitch();
      };

      if (prefersReducedMotion) {
        root.dataset.arcadeSwitchPhase = 'crossfade';
        withTimer(() => {
          if (token !== transitionToken) return;
          applyTabState(nextTab, { focusTab: false });
          completeSwitch();
        }, motion.crossfadeMs);
        return;
      }

      root.dataset.arcadeSwitchPhase = 'powerdown';

      withTimer(() => {
        if (token !== transitionToken) return;
        root.dataset.arcadeSwitchPhase = 'cartridge';
      }, motion.powerDownMs);

      withTimer(() => {
        if (token !== transitionToken) return;
        applyTabState(nextTab, { focusTab: false });
        root.dataset.arcadeSwitchPhase = 'warm';
      }, motion.powerDownMs + motion.cartridgeMs);

      withTimer(() => {
        completeSwitch();
      }, motion.powerDownMs + motion.cartridgeMs + motion.warmMs);
    };

    const setTab = (id, { notify = true, focusTab = false } = {}) => {
      const nextTab = safeTab(id);

      if (nextTab === activeTab && phase !== PHASE.SWITCHING) {
        if (focusTab) {
          focusCurrentTab();
        }
        return true;
      }

      if (phase === PHASE.SWITCHING) {
        queuedSwitch = { id: nextTab, notify, focusTab };
        root.dataset.arcadeSwitchTo = nextTab;
        tabs.forEach((tab) => tab.classList.toggle('is-target', tab.dataset.arcadeTab === nextTab));
        return true;
      }

      if (phase === PHASE.OPEN) {
        runSwitch(nextTab, { notify, focusTab });
        return true;
      }

      applyTabState(nextTab, { focusTab });
      notifyTabChange(nextTab, notify);
      return true;
    };

    const handleDocumentKeydown = (event) => {
      if (phase === PHASE.CLOSED) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusables = getFocusable();
      if (!focusables.length) {
        event.preventDefault();
        panel?.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const openShell = () => {
      if (phase === PHASE.OPEN || phase === PHASE.OPENING || phase === PHASE.SWITCHING) return;

      const motion = getMotion();
      const token = nextToken();

      clearTimers();
      clearSwitchClasses();
      setTabsBusy(false);
      queuedSwitch = null;

      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      root.classList.add('is-open');
      root.setAttribute('aria-hidden', 'false');
      document.body.classList.add('arcade-open');
      document.addEventListener('keydown', handleDocumentKeydown);

      setPhase(PHASE.OPENING);

      withTimer(() => {
        if (token !== transitionToken) return;
        setPhase(PHASE.OPEN);
        focusCurrentTab();
        if (typeof onOpen === 'function') onOpen();
        flushQueuedSwitch();
      }, motion.openMs);
    };

    const close = () => {
      if (phase === PHASE.CLOSED || phase === PHASE.CLOSING) return;

      const motion = getMotion();
      const token = nextToken();

      clearTimers();
      clearSwitchClasses();
      setTabsBusy(false);
      queuedSwitch = null;

      setPhase(PHASE.CLOSING);

      withTimer(() => {
        if (token !== transitionToken) return;

        setPhase(PHASE.CLOSED);
        root.classList.remove('is-open');
        root.setAttribute('aria-hidden', 'true');

        document.body.classList.remove('arcade-open');
        document.removeEventListener('keydown', handleDocumentKeydown);

        if (typeof onClose === 'function') onClose();

        if (previousFocus && previousFocus.isConnected) {
          previousFocus.focus();
        }
        previousFocus = null;
      }, motion.closeMs);
    };

    const handleTabClick = (event) => {
      const tabId = event.currentTarget?.dataset?.arcadeTab;
      if (!tabId) return;
      setTab(tabId, { notify: true });
    };

    const handleTabKeydown = (event) => {
      const source = event.currentTarget;
      if (!(source instanceof HTMLElement)) return;
      const index = tabs.indexOf(source);
      if (index < 0) return;

      const key = String(event.key || '').toLowerCase();
      const isForward = key === 'arrowright' || key === 'arrowdown';
      const isBackward = key === 'arrowleft' || key === 'arrowup';

      if (isForward || isBackward) {
        event.preventDefault();
        const dir = isForward ? 1 : -1;
        const nextIndex = (index + dir + tabs.length) % tabs.length;
        const nextTab = tabs[nextIndex];
        setTab(nextTab?.dataset?.arcadeTab, { notify: true, focusTab: true });
        return;
      }

      if (key === 'home') {
        event.preventDefault();
        setTab(tabs[0]?.dataset?.arcadeTab, { notify: true, focusTab: true });
        return;
      }

      if (key === 'end') {
        event.preventDefault();
        setTab(tabs[tabs.length - 1]?.dataset?.arcadeTab, { notify: true, focusTab: true });
        return;
      }

      if (key === ' ' || key === 'enter') {
        event.preventDefault();
        setTab(source.dataset.arcadeTab, { notify: true, focusTab: true });
      }
    };

    const handleMotionPrefChange = (event) => {
      prefersReducedMotion = Boolean(event?.matches);
      syncMotionAttrs();
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', handleTabClick);
      tab.addEventListener('keydown', handleTabKeydown);
    });
    closers.forEach((node) => node.addEventListener('click', close));

    if (reduceMotionQuery) {
      if (typeof reduceMotionQuery.addEventListener === 'function') {
        reduceMotionQuery.addEventListener('change', handleMotionPrefChange);
      } else if (typeof reduceMotionQuery.addListener === 'function') {
        reduceMotionQuery.addListener(handleMotionPrefChange);
      }
    }

    syncMotionAttrs();
    setPhase(PHASE.CLOSED);
    setTab(initialTab, { notify: false });

    return {
      open: openShell,
      close,
      setTab: (id) => setTab(id, { notify: true }),
      currentTab: () => activeTab,
      isOpen: () => phase === PHASE.OPEN || phase === PHASE.OPENING || phase === PHASE.SWITCHING,
      destroy: () => {
        clearTimers();
        nextToken();

        clearSwitchClasses();
        setTabsBusy(false);
        queuedSwitch = null;

        setPhase(PHASE.CLOSED);
        root.classList.remove('is-open');
        root.setAttribute('aria-hidden', 'true');

        tabs.forEach((tab) => {
          tab.removeEventListener('click', handleTabClick);
          tab.removeEventListener('keydown', handleTabKeydown);
        });
        closers.forEach((node) => node.removeEventListener('click', close));

        if (reduceMotionQuery) {
          if (typeof reduceMotionQuery.removeEventListener === 'function') {
            reduceMotionQuery.removeEventListener('change', handleMotionPrefChange);
          } else if (typeof reduceMotionQuery.removeListener === 'function') {
            reduceMotionQuery.removeListener(handleMotionPrefChange);
          }
        }

        document.removeEventListener('keydown', handleDocumentKeydown);
        document.body.classList.remove('arcade-open');
        previousFocus = null;
      },
    };
  };
})();
