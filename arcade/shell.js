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

    let activeTab = String(initialTab || '').trim() || 'pong';
    let open = false;
    let previousFocus = null;

    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

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

    const setTab = (id, { notify = true, focusTab = false } = {}) => {
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

      if (notify && typeof onTabChange === 'function') {
        onTabChange(nextTab);
      }

      return true;
    };

    const handleDocumentKeydown = (event) => {
      if (!open) return;

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
      if (open) return;
      open = true;
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      root.classList.add('is-open');
      root.setAttribute('aria-hidden', 'false');
      document.body.classList.add('arcade-open');
      document.addEventListener('keydown', handleDocumentKeydown);
      window.requestAnimationFrame(() => {
        focusCurrentTab();
      });
      if (typeof onOpen === 'function') onOpen();
    };

    const close = () => {
      if (!open) return;
      open = false;
      root.classList.remove('is-open');
      root.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('arcade-open');
      document.removeEventListener('keydown', handleDocumentKeydown);
      if (typeof onClose === 'function') onClose();
      if (previousFocus && previousFocus.isConnected) {
        previousFocus.focus();
      }
      previousFocus = null;
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

    tabs.forEach((tab) => {
      tab.addEventListener('click', handleTabClick);
      tab.addEventListener('keydown', handleTabKeydown);
    });
    closers.forEach((node) => node.addEventListener('click', close));

    setTab(initialTab, { notify: false });

    return {
      open: openShell,
      close,
      setTab: (id) => setTab(id, { notify: true }),
      currentTab: () => activeTab,
      isOpen: () => open,
      destroy: () => {
        close();
        tabs.forEach((tab) => {
          tab.removeEventListener('click', handleTabClick);
          tab.removeEventListener('keydown', handleTabKeydown);
        });
        closers.forEach((node) => node.removeEventListener('click', close));
      },
    };
  };
})();
