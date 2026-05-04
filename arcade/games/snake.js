(() => {
  const ns = (window.ChaseArcade = window.ChaseArcade || {});

  const STORAGE_KEY = 'cc_arcade_snake_best_v1';
  const CELL = 20;
  const COLS = 24;
  const ROWS = 16;
  const START_TICK_MS = 150;
  const MIN_TICK_MS = 82;

  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const keyMap = new Map([
    ['ArrowUp', 'up'],
    ['w', 'up'],
    ['W', 'up'],
    ['ArrowDown', 'down'],
    ['s', 'down'],
    ['S', 'down'],
    ['ArrowLeft', 'left'],
    ['a', 'left'],
    ['A', 'left'],
    ['ArrowRight', 'right'],
    ['d', 'right'],
    ['D', 'right'],
  ]);

  const sameCell = (a, b) => a.x === b.x && a.y === b.y;

  const randCell = () => ({
    x: Math.floor(Math.random() * COLS),
    y: Math.floor(Math.random() * ROWS),
  });

  const readBest = () => {
    try {
      const value = Number(localStorage.getItem(STORAGE_KEY) || 0);
      return Number.isFinite(value) ? value : 0;
    } catch (e) {
      return 0;
    }
  };

  const writeBest = (score) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(score));
    } catch (e) {}
  };

  ns.createSnakeGame = ({ canvas, scoreNode, bestNode, statusNode, controlsRoot } = {}) => {
    if (!(canvas instanceof HTMLCanvasElement)) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    let snake = [];
    let food = null;
    let hazards = [];
    let dir = directions.right;
    let queuedDir = directions.right;
    let score = 0;
    let best = readBest();
    let tickMs = START_TICK_MS;
    let timer = null;
    let running = false;
    let pointerStart = null;

    const setText = (node, text) => {
      if (node instanceof HTMLElement) node.textContent = String(text);
    };

    const occupied = (cell) =>
      snake.some((part) => sameCell(part, cell)) ||
      hazards.some((hazard) => sameCell(hazard, cell)) ||
      (food && sameCell(food, cell));

    const placeFreeCell = () => {
      for (let i = 0; i < 200; i += 1) {
        const cell = randCell();
        if (!occupied(cell)) return cell;
      }
      return { x: 1, y: 1 };
    };

    const setStatus = (text) => setText(statusNode, text);

    const updateHud = () => {
      setText(scoreNode, score);
      setText(bestNode, best);
    };

    const reset = () => {
      snake = [
        { x: 6, y: 8 },
        { x: 5, y: 8 },
        { x: 4, y: 8 },
      ];
      hazards = [
        { x: 14, y: 5, type: 'rock' },
        { x: 18, y: 10, type: 'spider' },
        { x: 10, y: 12, type: 'rock' },
      ];
      food = { x: 13, y: 8, type: 'leaf' };
      dir = directions.right;
      queuedDir = directions.right;
      score = 0;
      tickMs = START_TICK_MS;
      updateHud();
      setStatus('Eat leaves and crumbs. Avoid rocks, spiders, and your own trail.');
    };

    const addHazard = () => {
      if (hazards.length >= 7 || score < 5 || score % 5 !== 0) return;
      const next = placeFreeCell();
      next.type = Math.random() > 0.5 ? 'spider' : 'rock';
      hazards.push(next);
    };

    const placeFood = () => {
      food = placeFreeCell();
      food.type = Math.random() > 0.3 ? 'leaf' : 'crumb';
    };

    const drawLeaf = (cell, cx, cy) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.6);
      ctx.fillStyle = cell.type === 'crumb' ? '#9b7244' : '#6ee06d';
      ctx.beginPath();
      ctx.ellipse(0, 0, cell.type === 'crumb' ? 5 : 8, cell.type === 'crumb' ? 5 : 12, 0, 0, Math.PI * 2);
      ctx.fill();
      if (cell.type === 'leaf') {
        ctx.strokeStyle = 'rgba(21, 74, 24, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-1, -9);
        ctx.lineTo(1, 9);
        ctx.stroke();
      }
      ctx.restore();
    };

    const draw = () => {
      const scale = Math.min(canvas.width / (COLS * CELL), canvas.height / (ROWS * CELL));
      const width = COLS * CELL * scale;
      const height = ROWS * CELL * scale;
      const ox = (canvas.width - width) / 2;
      const oy = (canvas.height - height) / 2;
      const cellSize = CELL * scale;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0b160d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(ox, oy);

      ctx.fillStyle = '#172818';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(132, 204, 132, 0.1)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= COLS; x += 1) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, height);
        ctx.stroke();
      }
      for (let y = 0; y <= ROWS; y += 1) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(width, y * cellSize);
        ctx.stroke();
      }

      hazards.forEach((hazard) => {
        const cx = hazard.x * cellSize + cellSize / 2;
        const cy = hazard.y * cellSize + cellSize / 2;
        if (hazard.type === 'spider') {
          ctx.fillStyle = '#1c1d24';
          ctx.strokeStyle = '#0a0b10';
          ctx.lineWidth = 2;
          for (let i = -1; i <= 1; i += 2) {
            for (let leg = -2; leg <= 2; leg += 2) {
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.lineTo(cx + i * 13 * scale, cy + leg * 4 * scale);
              ctx.stroke();
            }
          }
          ctx.beginPath();
          ctx.arc(cx, cy, 7 * scale, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#6f746f';
          ctx.beginPath();
          ctx.roundRect(cx - 9 * scale, cy - 7 * scale, 18 * scale, 14 * scale, 4 * scale);
          ctx.fill();
        }
      });

      if (food) drawLeaf(food, food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2);

      snake.forEach((part, index) => {
        const cx = part.x * cellSize + cellSize / 2;
        const cy = part.y * cellSize + cellSize / 2;
        ctx.fillStyle = index === 0 ? '#b9f069' : '#83cf4d';
        ctx.strokeStyle = 'rgba(24, 66, 24, 0.65)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, (index === 0 ? 9 : 8) * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (index === 0) {
          ctx.fillStyle = '#172818';
          ctx.beginPath();
          ctx.arc(cx + 3 * scale, cy - 3 * scale, 1.8 * scale, 0, Math.PI * 2);
          ctx.arc(cx + 3 * scale, cy + 3 * scale, 1.8 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.restore();
    };

    const isReverse = (next) => next.x + dir.x === 0 && next.y + dir.y === 0;

    const queueDirection = (nextName) => {
      const next = directions[nextName];
      if (!next || isReverse(next)) return;
      queuedDir = next;
    };

    const gameOver = (reason) => {
      running = false;
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
      setStatus(`${reason} Press any direction to restart.`);
    };

    const step = () => {
      dir = queuedDir;
      const head = snake[0];
      const next = { x: head.x + dir.x, y: head.y + dir.y };

      if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
        gameOver('The caterpillar hit the garden edge.');
        draw();
        return;
      }

      if (snake.some((part) => sameCell(part, next)) || hazards.some((hazard) => sameCell(hazard, next))) {
        gameOver('The caterpillar got blocked.');
        draw();
        return;
      }

      snake.unshift(next);
      if (food && sameCell(next, food)) {
        score += food.type === 'leaf' ? 10 : 4;
        if (score > best) {
          best = score;
          writeBest(best);
        }
        tickMs = Math.max(MIN_TICK_MS, tickMs - 4);
        updateHud();
        addHazard();
        placeFood();
      } else {
        snake.pop();
      }

      draw();
      timer = window.setTimeout(step, tickMs);
    };

    const restartIfNeeded = () => {
      if (!running) {
        reset();
        running = true;
        draw();
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(step, tickMs);
      }
    };

    const handleKeyDown = (event) => {
      const next = keyMap.get(event.key);
      if (!next) return;
      event.preventDefault();
      restartIfNeeded();
      queueDirection(next);
    };

    const handleControl = (event) => {
      const control = event.currentTarget?.dataset?.snakeControl;
      restartIfNeeded();
      queueDirection(control);
    };

    const handlePointerDown = (event) => {
      pointerStart = { x: event.clientX, y: event.clientY };
    };

    const handlePointerUp = (event) => {
      if (!pointerStart) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      restartIfNeeded();
      queueDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    };

    const buttons = Array.from(controlsRoot?.querySelectorAll('[data-snake-control]') || []);
    buttons.forEach((button) => button.addEventListener('click', handleControl));
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);

    reset();
    draw();

    return {
      start: () => {
        if (running) return;
        running = true;
        window.addEventListener('keydown', handleKeyDown);
        draw();
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(step, tickMs);
      },
      stop: () => {
        running = false;
        window.removeEventListener('keydown', handleKeyDown);
        if (timer) {
          window.clearTimeout(timer);
          timer = null;
        }
      },
      reset,
    };
  };
})();
