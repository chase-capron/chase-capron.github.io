(() => {
  const ns = (window.ChaseArcade = window.ChaseArcade || {});

  const isEditableTarget = (target) => {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  };

  const SHAPES = [
    [[1, 1, 1, 1]],
    [
      [1, 1],
      [1, 1],
    ],
    [
      [0, 1, 0],
      [1, 1, 1],
    ],
    [
      [1, 0, 0],
      [1, 1, 1],
    ],
    [
      [0, 0, 1],
      [1, 1, 1],
    ],
    [
      [0, 1, 1],
      [1, 1, 0],
    ],
    [
      [1, 1, 0],
      [0, 1, 1],
    ],
  ];

  const COLORS = ['#7ef29a', '#6fc7ff', '#ffd166', '#ff8fab', '#bc8cff', '#ff985c', '#82f1f7'];

  const rotateMatrix = (matrix) => {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const next = Array.from({ length: cols }, () => Array(rows).fill(0));

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        next[c][rows - 1 - r] = matrix[r][c];
      }
    }

    return next;
  };

  ns.createTetrisGame = (input) => {
    const options = input instanceof HTMLCanvasElement ? { canvas: input } : (input || {});
    const canvas = options.canvas;

    if (!(canvas instanceof HTMLCanvasElement)) {
      return {
        start: () => {},
        stop: () => {},
        destroy: () => {},
      };
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        start: () => {},
        stop: () => {},
        destroy: () => {},
      };
    }

    const controlsRoot = options.controlsRoot instanceof HTMLElement ? options.controlsRoot : null;
    const scoreNode = options.scoreNode instanceof HTMLElement ? options.scoreNode : null;
    const linesNode = options.linesNode instanceof HTMLElement ? options.linesNode : null;
    const statusNode = options.statusNode instanceof HTMLElement ? options.statusNode : null;

    const cols = 10;
    const rows = 20;
    const block = 15;
    const offX = (canvas.width - cols * block) / 2;
    const offY = (canvas.height - rows * block) / 2;

    let board = Array.from({ length: rows }, () => Array(cols).fill(0));
    let piece = null;
    let running = false;
    let rafId = null;
    let lastTs = 0;
    let fallAccumulator = 0;
    let score = 0;
    let lines = 0;
    let dropIntervalMs = 460;
    let dirty = true;

    const makePiece = () => {
      const shapeIndex = Math.floor(Math.random() * SHAPES.length);
      const shape = SHAPES[shapeIndex].map((row) => row.slice());
      return {
        shape,
        color: COLORS[shapeIndex % COLORS.length],
        x: Math.floor((cols - shape[0].length) / 2),
        y: -1,
      };
    };

    const updateHud = () => {
      if (scoreNode) scoreNode.textContent = String(score);
      if (linesNode) linesNode.textContent = String(lines);
    };

    const setStatus = (text) => {
      if (statusNode) statusNode.textContent = text;
    };

    const collides = (candidate, dx = 0, dy = 0, shape = candidate.shape) => {
      for (let r = 0; r < shape.length; r += 1) {
        for (let c = 0; c < shape[r].length; c += 1) {
          if (!shape[r][c]) continue;
          const x = candidate.x + c + dx;
          const y = candidate.y + r + dy;
          if (x < 0 || x >= cols || y >= rows) return true;
          if (y >= 0 && board[y][x]) return true;
        }
      }
      return false;
    };

    const paintPieceToBoard = () => {
      for (let r = 0; r < piece.shape.length; r += 1) {
        for (let c = 0; c < piece.shape[r].length; c += 1) {
          if (!piece.shape[r][c]) continue;
          const x = piece.x + c;
          const y = piece.y + r;
          if (y >= 0 && y < rows && x >= 0 && x < cols) {
            board[y][x] = piece.color;
          }
        }
      }
    };

    const clearLines = () => {
      let cleared = 0;
      for (let r = rows - 1; r >= 0; r -= 1) {
        if (!board[r].every(Boolean)) continue;
        board.splice(r, 1);
        board.unshift(Array(cols).fill(0));
        cleared += 1;
        r += 1;
      }

      if (!cleared) return;

      lines += cleared;
      score += [0, 100, 240, 420, 680][cleared] || cleared * 240;
      dropIntervalMs = Math.max(150, 460 - Math.min(260, lines * 8));
      updateHud();
      setStatus(cleared > 1 ? `Nice! Cleared ${cleared} lines.` : 'Line cleared.');
      dirty = true;
    };

    const spawnPiece = () => {
      piece = makePiece();
      if (collides(piece)) {
        board = Array.from({ length: rows }, () => Array(cols).fill(0));
        score = 0;
        lines = 0;
        dropIntervalMs = 460;
        updateHud();
        setStatus('Game over. Board reset.');
      }
      dirty = true;
    };

    const drawBlock = (x, y, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(offX + x * block, offY + y * block, block - 1, block - 1);
    };

    const draw = () => {
      ctx.fillStyle = '#050814';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          drawBlock(c, r, board[r][c] || 'rgba(255,255,255,0.07)');
        }
      }

      if (!piece) return;

      for (let r = 0; r < piece.shape.length; r += 1) {
        for (let c = 0; c < piece.shape[r].length; c += 1) {
          if (!piece.shape[r][c]) continue;
          const y = piece.y + r;
          if (y < 0) continue;
          drawBlock(piece.x + c, y, piece.color);
        }
      }
    };

    const moveHorizontal = (direction) => {
      if (!running || !piece) return;
      if (collides(piece, direction, 0)) return;
      piece.x += direction;
    };

    const rotatePiece = () => {
      if (!running || !piece) return;
      const rotated = rotateMatrix(piece.shape);
      const kicks = [0, -1, 1, -2, 2];
      const nextX = kicks.find((kick) => !collides(piece, kick, 0, rotated));
      if (typeof nextX !== 'number') return;
      piece.shape = rotated;
      piece.x += nextX;
    };

    const settlePiece = () => {
      if (!piece) return;
      paintPieceToBoard();
      clearLines();
      spawnPiece();
    };

    const softDrop = () => {
      if (!running || !piece) return;
      if (collides(piece, 0, 1)) {
        settlePiece();
      } else {
        piece.y += 1;
      }
    };

    const hardDrop = () => {
      if (!running || !piece) return;
      while (!collides(piece, 0, 1)) {
        piece.y += 1;
      }
      settlePiece();
    };

    const onAction = (action) => {
      switch (action) {
        case 'left':
          moveHorizontal(-1);
          break;
        case 'right':
          moveHorizontal(1);
          break;
        case 'down':
          softDrop();
          break;
        case 'rotate':
          rotatePiece();
          break;
        case 'drop':
          hardDrop();
          break;
        default:
          break;
      }
      dirty = true;
    };

    const onKeyDown = (event) => {
      if (!running) return;
      if (isEditableTarget(event.target)) return;

      const key = String(event.key || '').toLowerCase();
      if (key === 'arrowleft' || key === 'a') {
        event.preventDefault();
        onAction('left');
      } else if (key === 'arrowright' || key === 'd') {
        event.preventDefault();
        onAction('right');
      } else if (key === 'arrowdown' || key === 's') {
        event.preventDefault();
        onAction('down');
      } else if (key === 'arrowup' || key === 'w' || key === 'x') {
        event.preventDefault();
        onAction('rotate');
      } else if (key === ' ') {
        event.preventDefault();
        onAction('drop');
      }
    };

    const controlButtons = controlsRoot
      ? Array.from(controlsRoot.querySelectorAll('[data-tetris-control]'))
      : [];

    const onControl = (event) => {
      if (!running) return;
      const action = event.currentTarget?.dataset?.tetrisControl;
      if (!action) return;
      event.preventDefault();
      onAction(action);
      event.currentTarget?.classList.add('is-active');
      window.setTimeout(() => {
        event.currentTarget?.classList.remove('is-active');
      }, 110);
    };

    controlButtons.forEach((button) => {
      button.addEventListener('click', onControl);
    });

    const frame = (ts) => {
      if (!running) return;
      if (!lastTs) lastTs = ts;
      const delta = ts - lastTs;
      lastTs = ts;
      fallAccumulator += delta;

      if (fallAccumulator >= dropIntervalMs) {
        softDrop();
        fallAccumulator = 0;
        dirty = true;
      }

      if (dirty) {
        draw();
        dirty = false;
      }

      rafId = window.requestAnimationFrame(frame);
    };

    const stop = () => {
      running = false;
      lastTs = 0;
      fallAccumulator = 0;
      dirty = true;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    window.addEventListener('keydown', onKeyDown);

    spawnPiece();
    updateHud();
    setStatus('Arrow keys or on-screen controls.');
    draw();

    return {
      start: () => {
        if (running) return;
        running = true;
        dirty = true;
        setStatus('Stack clean. Keep dropping.');
        rafId = window.requestAnimationFrame(frame);
      },
      stop,
      destroy: () => {
        stop();
        window.removeEventListener('keydown', onKeyDown);
        controlButtons.forEach((button) => {
          button.removeEventListener('click', onControl);
        });
      },
    };
  };
})();
