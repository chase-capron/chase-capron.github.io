(() => {
  const ns = (window.ChaseArcade = window.ChaseArcade || {});

  ns.createTetrisGame = (canvas) => {
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

    const cols = 12;
    const rows = 20;
    const size = 16;
    const offX = (canvas.width - cols * size) / 2;
    const offY = (canvas.height - rows * size) / 2;
    const palette = ['#7ef29a', '#6fc7ff', '#ffd166', '#ff8fab'];

    let grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    let piece = { x: 5, y: 0, c: '#7ef29a' };
    let timer = null;

    const resetPiece = () => {
      piece = {
        x: Math.floor(Math.random() * cols),
        y: 0,
        c: palette[Math.floor(Math.random() * palette.length)],
      };
    };

    const draw = () => {
      ctx.fillStyle = '#050814';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          if (grid[r][c]) {
            ctx.fillStyle = grid[r][c];
          } else {
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
          }
          ctx.fillRect(offX + c * size, offY + r * size, size - 1, size - 1);
        }
      }

      ctx.fillStyle = piece.c;
      ctx.fillRect(offX + piece.x * size, offY + piece.y * size, size - 1, size - 1);
    };

    const tick = () => {
      if (piece.y < rows - 1 && !grid[piece.y + 1][piece.x]) {
        piece.y += 1;
      } else {
        grid[piece.y][piece.x] = piece.c;
        resetPiece();
      }

      for (let r = rows - 1; r >= 0; r -= 1) {
        if (grid[r].every(Boolean)) {
          grid.splice(r, 1);
          grid.unshift(Array(cols).fill(0));
        }
      }

      draw();
    };

    const stop = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    return {
      start: () => {
        if (timer) return;
        draw();
        timer = window.setInterval(tick, 180);
      },
      stop,
      destroy: () => {
        stop();
        grid = Array.from({ length: rows }, () => Array(cols).fill(0));
        resetPiece();
        draw();
      },
    };
  };
})();
