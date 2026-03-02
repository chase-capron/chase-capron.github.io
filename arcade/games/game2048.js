(() => {
  const ns = (window.ChaseArcade = window.ChaseArcade || {});

  const STORAGE_KEY = 'cc_arcade_2048_best_v1';

  const isEditableTarget = (target) => {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  };

  const randomPick = (items) => items[Math.floor(Math.random() * items.length)];

  const cloneBoard = (board) => board.slice();

  const emptyIndexes = (board) => {
    const result = [];
    board.forEach((value, index) => {
      if (!value) result.push(index);
    });
    return result;
  };

  const spawnTile = (board) => {
    const empties = emptyIndexes(board);
    if (!empties.length) return board;
    const index = randomPick(empties);
    board[index] = Math.random() < 0.9 ? 2 : 4;
    return board;
  };

  const compressLine = (line) => {
    const filled = line.filter(Boolean);
    const merged = [];

    for (let i = 0; i < filled.length; i += 1) {
      if (filled[i] && filled[i] === filled[i + 1]) {
        merged.push(filled[i] * 2);
        i += 1;
      } else {
        merged.push(filled[i]);
      }
    }

    while (merged.length < 4) merged.push(0);
    return merged;
  };

  const boardToRows = (board) => [
    board.slice(0, 4),
    board.slice(4, 8),
    board.slice(8, 12),
    board.slice(12, 16),
  ];

  const rowsToBoard = (rows) => rows.flat();

  const transpose = (rows) => {
    const out = Array.from({ length: 4 }, () => Array(4).fill(0));
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        out[c][r] = rows[r][c];
      }
    }
    return out;
  };

  const canMove = (board) => {
    if (board.some((value) => value === 0)) return true;
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        const value = board[r * 4 + c];
        if (c < 3 && value === board[r * 4 + c + 1]) return true;
        if (r < 3 && value === board[(r + 1) * 4 + c]) return true;
      }
    }
    return false;
  };

  ns.create2048Game = ({
    boardRoot,
    scoreNode,
    bestNode,
    statusNode,
    controlsRoot,
    resetButton,
  } = {}) => {
    if (!(boardRoot instanceof HTMLElement)) {
      return {
        start: () => {},
        stop: () => {},
        destroy: () => {},
      };
    }

    let board = Array(16).fill(0);
    let score = 0;
    let best = 0;
    let running = false;
    let won = false;

    let touchStartX = 0;
    let touchStartY = 0;

    try {
      const persistedBest = Number(localStorage.getItem(STORAGE_KEY) || '0');
      if (Number.isFinite(persistedBest) && persistedBest > 0) best = persistedBest;
    } catch (e) {
      // noop
    }

    const setStatus = (text) => {
      if (statusNode) statusNode.textContent = text;
    };

    const saveBest = () => {
      try {
        localStorage.setItem(STORAGE_KEY, String(best));
      } catch (e) {
        // noop
      }
    };

    const render = () => {
      boardRoot.innerHTML = '';
      boardRoot.setAttribute('role', 'grid');
      boardRoot.setAttribute('aria-label', '2048 board');

      board.forEach((value) => {
        const cell = document.createElement('div');
        cell.className = `game2048-cell${value ? ` v-${value}` : ''}`;
        cell.setAttribute('role', 'gridcell');
        cell.textContent = value ? String(value) : '';
        boardRoot.appendChild(cell);
      });

      if (scoreNode) scoreNode.textContent = String(score);
      if (bestNode) bestNode.textContent = String(best);
    };

    const reset = () => {
      board = Array(16).fill(0);
      score = 0;
      won = false;
      spawnTile(board);
      spawnTile(board);
      render();
      setStatus('Combine tiles to reach 2048.');
    };

    const move = (direction) => {
      if (!running) return;

      const before = cloneBoard(board);
      let rows = boardToRows(before);

      const scoreLine = (lineBefore, lineAfter) =>
        lineAfter.reduce((sum, value, index) => {
          if (!value) return sum;
          return sum + (value !== lineBefore[index] ? value : 0);
        }, 0);

      let deltaScore = 0;

      if (direction === 'left') {
        rows = rows.map((line) => {
          const lineAfter = compressLine(line);
          deltaScore += scoreLine(line, lineAfter);
          return lineAfter;
        });
      } else if (direction === 'right') {
        rows = rows.map((line) => {
          const reversed = line.slice().reverse();
          const compressed = compressLine(reversed).reverse();
          deltaScore += scoreLine(line, compressed);
          return compressed;
        });
      } else if (direction === 'up') {
        rows = transpose(rows)
          .map((line) => {
            const lineAfter = compressLine(line);
            deltaScore += scoreLine(line, lineAfter);
            return lineAfter;
          });
        rows = transpose(rows);
      } else if (direction === 'down') {
        rows = transpose(rows)
          .map((line) => {
            const reversed = line.slice().reverse();
            const compressed = compressLine(reversed).reverse();
            deltaScore += scoreLine(line, compressed);
            return compressed;
          });
        rows = transpose(rows);
      } else {
        return;
      }

      const after = rowsToBoard(rows);
      const changed = after.some((value, index) => value !== before[index]);

      if (!changed) return;

      board = after;
      score += deltaScore;
      best = Math.max(best, score);
      saveBest();
      spawnTile(board);

      if (!won && board.some((value) => value >= 2048)) {
        won = true;
        setStatus('2048 reached. Keep going.');
      } else if (!canMove(board)) {
        setStatus('No moves left. Tap New Game.');
      }

      render();
    };

    const onKeyDown = (event) => {
      if (!running) return;
      if (isEditableTarget(event.target)) return;

      const key = String(event.key || '').toLowerCase();
      if (key === 'arrowleft' || key === 'a') {
        event.preventDefault();
        move('left');
      } else if (key === 'arrowright' || key === 'd') {
        event.preventDefault();
        move('right');
      } else if (key === 'arrowup' || key === 'w') {
        event.preventDefault();
        move('up');
      } else if (key === 'arrowdown' || key === 's') {
        event.preventDefault();
        move('down');
      } else if (key === 'r') {
        event.preventDefault();
        reset();
      }
    };

    const controlButtons = controlsRoot
      ? Array.from(controlsRoot.querySelectorAll('[data-2048-control]'))
      : [];

    const onControl = (event) => {
      if (!running) return;
      const dir = event.currentTarget?.dataset?.['2048Control'];
      if (!dir) return;
      event.preventDefault();
      move(dir);
      event.currentTarget?.classList.add('is-active');
      window.setTimeout(() => event.currentTarget?.classList.remove('is-active'), 110);
    };

    const onTouchStart = (event) => {
      if (!running) return;
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    };

    const onTouchEnd = (event) => {
      if (!running) return;
      const touch = event.changedTouches?.[0];
      if (!touch) return;

      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const threshold = 22;

      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        move(dx > 0 ? 'right' : 'left');
      } else {
        move(dy > 0 ? 'down' : 'up');
      }
    };

    const onReset = (event) => {
      event.preventDefault();
      reset();
    };

    window.addEventListener('keydown', onKeyDown);
    boardRoot.addEventListener('touchstart', onTouchStart, { passive: true });
    boardRoot.addEventListener('touchend', onTouchEnd, { passive: true });
    boardRoot.setAttribute('tabindex', '0');

    controlButtons.forEach((button) => button.addEventListener('click', onControl));
    resetButton?.addEventListener('click', onReset);

    reset();

    return {
      start: () => {
        running = true;
      },
      stop: () => {
        running = false;
      },
      destroy: () => {
        running = false;
        window.removeEventListener('keydown', onKeyDown);
        boardRoot.removeEventListener('touchstart', onTouchStart);
        boardRoot.removeEventListener('touchend', onTouchEnd);
        controlButtons.forEach((button) => button.removeEventListener('click', onControl));
        resetButton?.removeEventListener('click', onReset);
      },
    };
  };
})();
