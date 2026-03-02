(() => {
  const ns = (window.ChaseArcade = window.ChaseArcade || {});

  const STORAGE_KEY = 'cc_arcade_state_v1';
  const DEFAULT_TAB = 'pong';
  const ALLOWED_TABS = new Set(['pong', 'tetris', 'pokemon', '2048']);

  const normalizeTab = (value) => {
    const candidate = String(value || '').trim().toLowerCase();
    return ALLOWED_TABS.has(candidate) ? candidate : DEFAULT_TAB;
  };

  const defaultState = () => ({
    discovered: false,
    activeTab: DEFAULT_TAB,
    isOpen: false,
    lastUnlockedAt: 0,
    unlockCount: 0,
  });

  const safeParse = (raw) => {
    try {
      const parsed = JSON.parse(String(raw || '{}'));
      if (!parsed || typeof parsed !== 'object') return defaultState();

      return {
        discovered: Boolean(parsed.discovered),
        activeTab: normalizeTab(parsed.activeTab),
        isOpen: false,
        lastUnlockedAt: Number.isFinite(parsed.lastUnlockedAt) ? parsed.lastUnlockedAt : 0,
        unlockCount: Number.isFinite(parsed.unlockCount) ? parsed.unlockCount : 0,
      };
    } catch (e) {
      return defaultState();
    }
  };

  ns.createStateStore = ({ storageKey = STORAGE_KEY } = {}) => {
    let state = defaultState();
    const listeners = new Set();

    const notify = () => {
      const snapshot = { ...state };
      listeners.forEach((listener) => {
        try {
          listener(snapshot);
        } catch (e) {
          // noop
        }
      });
    };

    const persist = () => {
      try {
        const payload = {
          discovered: state.discovered,
          activeTab: normalizeTab(state.activeTab),
          lastUnlockedAt: state.lastUnlockedAt,
          unlockCount: state.unlockCount,
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch (e) {
        // noop
      }
    };

    const patch = (next, { save = true } = {}) => {
      state = {
        ...state,
        ...next,
        activeTab: normalizeTab(next?.activeTab ?? state.activeTab),
      };

      if (save) persist();
      notify();
      return { ...state };
    };

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) state = safeParse(stored);
    } catch (e) {
      // noop
    }

    return {
      snapshot: () => ({ ...state }),
      patch,
      setOpen: (isOpen) => patch({ isOpen: Boolean(isOpen) }, { save: false }),
      setActiveTab: (tab) => patch({ activeTab: normalizeTab(tab) }),
      markDiscovered: () =>
        patch({
          discovered: true,
          unlockCount: state.unlockCount + 1,
          lastUnlockedAt: Date.now(),
        }),
      subscribe: (listener) => {
        if (typeof listener !== 'function') return () => {};
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  };
})();
