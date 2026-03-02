(() => {
  const ns = (window.ChaseArcade = window.ChaseArcade || {});

  const noopController = {
    syncTheme: () => {},
    open: () => {},
    close: () => {},
    destroy: () => {},
  };

  const findLegacyTrigger = () =>
    Array.from(document.querySelectorAll('.hardware-card .hardware-card__name'))
      .find((node) => node.textContent?.trim() === 'Legacy Device Builds')
      ?.closest('a.hardware-card');

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
        'pokemon',
        ns.createBattleGame?.({
          enemyHp: document.getElementById('enemyHp'),
          playerHp: document.getElementById('playerHp'),
          battleLog: document.getElementById('battleLog'),
          battleScene: document.getElementById('battleScene'),
          moveButtons: Array.from(document.querySelectorAll('[data-battle-move]')),
        }),
      ],
    ]);

    const shell = createShellController({
      root: shellNode,
      initialTab: initialState.activeTab,
      onOpen: () => {
        state.setOpen(true);
        const activeGame = games.get(shell.currentTab());
        activeGame?.start?.();
      },
      onClose: () => {
        state.setOpen(false);
        stopGames(games);
      },
      onTabChange: (tabId) => {
        state.setActiveTab(tabId);
        if (!shell.isOpen()) return;
        stopGames(games);
        games.get(tabId)?.start?.();
      },
    });

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
        trigger.setAttribute('data-arcade-discovered', 'true');
        shell.open();
      },
    });

    const themeAdapter = createThemeAdapter({
      siteRoot: root,
      shellRoot: shellNode,
    });

    if (initialState.discovered) {
      trigger.setAttribute('data-arcade-discovered', 'true');
    }

    return {
      syncTheme: (themeId) => {
        themeAdapter.apply(themeId || root.dataset.theme || 'default');
      },
      open: () => shell.open(),
      close: () => shell.close(),
      destroy: () => {
        unlockTrigger.destroy();
        shell.destroy();
        stopGames(games);
        games.forEach((game) => game?.destroy?.());
        themeAdapter.destroy();
      },
    };
  };
})();
