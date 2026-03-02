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

    const tabs = Array.from(root.querySelectorAll('[data-arcade-tab]'));
    const panes = Array.from(root.querySelectorAll('[data-arcade-pane]'));
    const closers = Array.from(root.querySelectorAll('[data-arcade-close]'));
    const closeButton = root.querySelector('.arcade-shell__close');

    let activeTab = String(initialTab || '').trim() || 'pong';
    let open = false;

    const safeTab = (id) => {
      const candidate = String(id || '').trim();
      return tabs.some((tab) => tab.dataset.arcadeTab === candidate)
        ? candidate
        : tabs[0]?.dataset.arcadeTab || 'pong';
    };

    const setTab = (id, { notify = true } = {}) => {
      const nextTab = safeTab(id);
      activeTab = nextTab;

      tabs.forEach((tab) => {
        const isActive = tab.dataset.arcadeTab === nextTab;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      panes.forEach((pane) => {
        pane.classList.toggle('is-active', pane.dataset.arcadePane === nextTab);
      });

      if (notify && typeof onTabChange === 'function') {
        onTabChange(nextTab);
      }

      return true;
    };

    const handleEsc = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close();
    };

    const openShell = () => {
      if (open) return;
      open = true;
      root.classList.add('is-open');
      root.setAttribute('aria-hidden', 'false');
      document.body.classList.add('arcade-open');
      document.addEventListener('keydown', handleEsc);
      closeButton?.focus();
      if (typeof onOpen === 'function') onOpen();
    };

    const close = () => {
      if (!open) return;
      open = false;
      root.classList.remove('is-open');
      root.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('arcade-open');
      document.removeEventListener('keydown', handleEsc);
      if (typeof onClose === 'function') onClose();
    };

    const handleTabClick = (event) => {
      const tabId = event.currentTarget?.dataset?.arcadeTab;
      if (!tabId) return;
      setTab(tabId, { notify: true });
    };

    tabs.forEach((tab) => tab.addEventListener('click', handleTabClick));
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
        tabs.forEach((tab) => tab.removeEventListener('click', handleTabClick));
        closers.forEach((node) => node.removeEventListener('click', close));
      },
    };
  };
})();
