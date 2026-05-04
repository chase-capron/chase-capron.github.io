(() => {
  const ns = (window.ChaseArcade = window.ChaseArcade || {});

  const noopController = {
    syncTheme: () => {},
    open: () => {},
    close: () => {},
    destroy: () => {},
  };

  const findLegacyTrigger = () => {
    const card = Array.from(document.querySelectorAll('a.hardware-card')).find(
      (node) => node.querySelector('.hardware-card__name')?.textContent?.trim() === 'Legacy Device Builds'
    );

    return card?.querySelector('.hardware-card__icon') || card || null;
  };

  const stopGames = (games) => {
    games.forEach((game) => {
      try {
        game?.stop?.();
      } catch (e) {
        // noop
      }
    });
  };

  ns.init = ({ siteRoot, triggerElement, shellRoot } = {}) => {
    const root = siteRoot instanceof HTMLElement ? siteRoot : document.documentElement;
    const trigger = triggerElement instanceof HTMLElement ? triggerElement : findLegacyTrigger();
    const shellNode = shellRoot instanceof HTMLElement ? shellRoot : document.getElementById('retroArcade');

    if (!trigger || !shellNode) return noopController;

    const triggerCard =
      trigger instanceof HTMLAnchorElement
        ? trigger
        : trigger.closest?.('a.hardware-card') || null;

    const markDiscovered = () => {
      trigger.setAttribute('data-arcade-discovered', 'true');
      triggerCard?.setAttribute('data-arcade-discovered', 'true');
    };

    const createStateStore = ns.createStateStore;
    const createThemeAdapter = ns.createThemeAdapter;
    const createTapUnlockTrigger = ns.createTapUnlockTrigger;
    const createShellController = ns.createShellController;

    if (
      typeof createStateStore !== 'function' ||
      typeof createThemeAdapter !== 'function' ||
      typeof createTapUnlockTrigger !== 'function' ||
      typeof createShellController !== 'function'
    ) {
      return noopController;
    }

    const state = createStateStore();
    const initialState = state.snapshot();

    const games = new Map([
      [
        'pong',
        ns.createPongGame?.({
          canvas: document.getElementById('arcadePong'),
          controlsRoot: document.querySelector('[data-control-group="pong"]'),
          scoreLeftNode: document.getElementById('pongScoreLeft'),
          scoreRightNode: document.getElementById('pongScoreRight'),
        }),
      ],
      [
        'tetris',
        ns.createTetrisGame?.({
          canvas: document.getElementById('arcadeTetris'),
          controlsRoot: document.querySelector('[data-control-group="tetris"]'),
          scoreNode: document.getElementById('tetrisScore'),
          linesNode: document.getElementById('tetrisLines'),
          statusNode: document.getElementById('tetrisStatus'),
        }),
      ],
      [
        '2048',
        ns.create2048Game?.({
          boardRoot: document.getElementById('arcade2048'),
          scoreNode: document.getElementById('game2048Score'),
          bestNode: document.getElementById('game2048Best'),
          statusNode: document.getElementById('game2048Status'),
          controlsRoot: document.querySelector('[data-control-group="2048"]'),
          resetButton: document.querySelector('[data-2048-reset]'),
        }),
      ],
      [
        'dino3d',
        ns.createDino3DGame?.({
          canvas: document.getElementById('arcadeDino3d'),
          controlsRoot: document.querySelector('[data-control-group="dino3d"]'),
          scoreNode: document.getElementById('dino3dScore'),
          bestNode: document.getElementById('dino3dBest'),
          statusNode: document.getElementById('dino3dStatus'),
        }),
      ],
      [
        'snake',
        ns.createSnakeGame?.({
          canvas: document.getElementById('arcadeSnake'),
          scoreNode: document.getElementById('snakeScore'),
          bestNode: document.getElementById('snakeBest'),
          statusNode: document.getElementById('snakeStatus'),
          controlsRoot: document.querySelector('[data-control-group="snake"]'),
        }),
      ],
    ]);

    const announceNode = document.getElementById('arcadeAnnouncer');
    let announceTimer = null;

    const announce = (text) => {
      if (!(announceNode instanceof HTMLElement)) return;
      const message = String(text || '').trim();
      if (!message) return;

      announceNode.textContent = '';
      if (announceTimer) {
        window.clearTimeout(announceTimer);
      }
      announceTimer = window.setTimeout(() => {
        announceNode.textContent = message;
      }, 40);
    };

    const startGame = (tabId) => {
      if (document.hidden) return;
      stopGames(games);
      games.get(tabId)?.start?.();
    };

    const shell = createShellController({
      root: shellNode,
      initialTab: initialState.activeTab,
      onOpen: () => {
        state.setOpen(true);
        startGame(shell.currentTab());
        announce(`Arcade open. ${shell.currentTab()} active.`);
      },
      onClose: () => {
        state.setOpen(false);
        stopGames(games);
        announce('Arcade closed.');
      },
      onTabChange: (tabId) => {
        state.setActiveTab(tabId);
        if (!shell.isOpen()) return;
        startGame(tabId);
        announce(`${tabId} selected.`);
      },
    });

    const handleVisibilityChange = () => {
      if (!shell.isOpen()) return;
      if (document.hidden) {
        stopGames(games);
      } else {
        startGame(shell.currentTab());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const unlockTrigger = createTapUnlockTrigger({
      element: trigger,
      requiredTaps: 10,
      timeoutMs: 6000,
      onProgress: ({ taps, tapsRequired }) => {
        const progress = tapsRequired > 0 ? taps / tapsRequired : 0;
        shellNode.style.setProperty('--arcade-unlock-progress', progress.toFixed(3));
      },
      onUnlock: () => {
        state.markDiscovered();
        markDiscovered();
        announce('Retro arcade unlocked.');
        shell.open();
      },
    });

    const themeAdapter = createThemeAdapter({
      siteRoot: root,
      shellRoot: shellNode,
    });

    if (initialState.discovered) {
      markDiscovered();
    }

    return {
      syncTheme: (themeId) => {
        themeAdapter.apply(themeId || root.dataset.theme || 'default');
      },
      open: () => shell.open(),
      close: () => shell.close(),
      destroy: () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (announceTimer) {
          window.clearTimeout(announceTimer);
          announceTimer = null;
        }
        unlockTrigger.destroy();
        shell.destroy();
        stopGames(games);
        games.forEach((game) => game?.destroy?.());
        themeAdapter.destroy();
      },
    };
  };
})();
