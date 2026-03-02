(() => {
  const ns = (window.ChaseArcade = window.ChaseArcade || {});

  const isEditableTarget = (target) => {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      target.isContentEditable
    );
  };

  ns.createPongGame = (input) => {
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
    const scoreLeftNode = options.scoreLeftNode instanceof HTMLElement ? options.scoreLeftNode : null;
    const scoreRightNode = options.scoreRightNode instanceof HTMLElement ? options.scoreRightNode : null;

    const w = canvas.width;
    const h = canvas.height;
    const paddleWidth = 12;
    const paddleHeight = 92;

    const ball = { x: w / 2, y: h / 2, vx: 270, vy: 200, r: 8 };
    const left = { x: 18, y: h / 2 - paddleHeight / 2, vy: 0 };
    const right = { x: w - 18 - paddleWidth, y: h / 2 - paddleHeight / 2, vy: 0 };

    const inputState = { up: false, down: false };

    let leftScore = 0;
    let rightScore = 0;
    let running = false;
    let rafId = null;
    let lastTs = 0;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const updateScoreUi = () => {
      if (scoreLeftNode) scoreLeftNode.textContent = String(leftScore);
      if (scoreRightNode) scoreRightNode.textContent = String(rightScore);
    };

    const resetBall = (direction = 1) => {
      ball.x = w / 2;
      ball.y = h / 2;
      ball.vx = direction * (240 + Math.random() * 60);
      ball.vy = (Math.random() * 2 - 1) * 180;
    };

    const controlButtons = controlsRoot
      ? Array.from(controlsRoot.querySelectorAll('[data-pong-control]'))
      : [];

    const updateInputFromButtons = () => {
      if (!controlButtons.length) return;
      controlButtons.forEach((btn) => {
        const dir = btn.getAttribute('data-pong-control');
        const active = dir === 'up' ? inputState.up : inputState.down;
        btn.classList.toggle('is-active', Boolean(active));
      });
    };

    const setButtonDirection = (direction, pressed) => {
      if (direction === 'up') inputState.up = pressed;
      if (direction === 'down') inputState.down = pressed;
      updateInputFromButtons();
    };

    const handleKeyboard = (event, pressed) => {
      if (!running) return;
      if (isEditableTarget(event.target)) return;

      const key = String(event.key || '').toLowerCase();
      if (key === 'arrowup' || key === 'w') {
        event.preventDefault();
        inputState.up = pressed;
      } else if (key === 'arrowdown' || key === 's') {
        event.preventDefault();
        inputState.down = pressed;
      }

      updateInputFromButtons();
    };

    const handlePointerMove = (event) => {
      if (!running) return;
      if (event.pointerType === 'mouse' && (event.buttons & 1) !== 1) return;

      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const relativeY = (event.clientY - rect.top) / rect.height;
      const targetY = relativeY * h - paddleHeight / 2;
      left.y = clamp(targetY, 0, h - paddleHeight);
    };

    const releaseInputs = () => {
      inputState.up = false;
      inputState.down = false;
      updateInputFromButtons();
    };

    const onControlPress = (event) => {
      if (!running) return;
      const button = event.currentTarget;
      if (!(button instanceof HTMLElement)) return;
      const direction = button.dataset.pongControl;
      if (!direction) return;
      event.preventDefault();
      if (typeof button.setPointerCapture === 'function' && Number.isInteger(event.pointerId)) {
        try {
          button.setPointerCapture(event.pointerId);
        } catch (e) {
          // noop
        }
      }
      setButtonDirection(direction, true);
    };

    const onControlRelease = (event) => {
      const button = event.currentTarget;
      if (!(button instanceof HTMLElement)) return;
      if (typeof button.releasePointerCapture === 'function' && Number.isInteger(event.pointerId)) {
        try {
          button.releasePointerCapture(event.pointerId);
        } catch (e) {
          // noop
        }
      }
      const direction = button.dataset.pongControl;
      if (!direction) return;
      setButtonDirection(direction, false);
    };

    controlButtons.forEach((button) => {
      button.addEventListener('pointerdown', onControlPress);
      button.addEventListener('pointerup', onControlRelease);
      button.addEventListener('pointerleave', onControlRelease);
      button.addEventListener('pointercancel', onControlRelease);
    });

    const update = (delta) => {
      const paddleSpeed = 320;
      const aiSpeed = 290;

      const dir = (inputState.down ? 1 : 0) - (inputState.up ? 1 : 0);
      left.vy = dir * paddleSpeed;
      left.y = clamp(left.y + left.vy * delta, 0, h - paddleHeight);

      const target = ball.y - paddleHeight / 2;
      const aiDelta = clamp(target - right.y, -aiSpeed * delta, aiSpeed * delta);
      right.y = clamp(right.y + aiDelta, 0, h - paddleHeight);

      ball.x += ball.vx * delta;
      ball.y += ball.vy * delta;

      if (ball.y < ball.r) {
        ball.y = ball.r;
        ball.vy *= -1;
      } else if (ball.y > h - ball.r) {
        ball.y = h - ball.r;
        ball.vy *= -1;
      }

      const collides = (paddleX, paddleY) =>
        ball.x + ball.r > paddleX &&
        ball.x - ball.r < paddleX + paddleWidth &&
        ball.y + ball.r > paddleY &&
        ball.y - ball.r < paddleY + paddleHeight;

      if (collides(left.x, left.y) && ball.vx < 0) {
        const hitOffset = (ball.y - (left.y + paddleHeight / 2)) / (paddleHeight / 2);
        ball.x = left.x + paddleWidth + ball.r;
        ball.vx = Math.abs(ball.vx) * 1.03;
        ball.vy += hitOffset * 85;
      } else if (collides(right.x, right.y) && ball.vx > 0) {
        const hitOffset = (ball.y - (right.y + paddleHeight / 2)) / (paddleHeight / 2);
        ball.x = right.x - ball.r;
        ball.vx = -Math.abs(ball.vx) * 1.03;
        ball.vy += hitOffset * 85;
      }

      if (ball.x < -40) {
        rightScore += 1;
        updateScoreUi();
        resetBall(1);
      } else if (ball.x > w + 40) {
        leftScore += 1;
        updateScoreUi();
        resetBall(-1);
      }
    };

    const draw = () => {
      ctx.fillStyle = '#050814';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255,255,255,0.24)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.font = '700 28px "JetBrains Mono", "SFMono-Regular", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(leftScore), w * 0.35, 44);
      ctx.fillText(String(rightScore), w * 0.65, 44);

      ctx.fillStyle = '#9ad1ff';
      ctx.fillRect(left.x, left.y, paddleWidth, paddleHeight);
      ctx.fillRect(right.x, right.y, paddleWidth, paddleHeight);

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
    };

    const frame = (ts) => {
      if (!running) return;
      if (!lastTs) lastTs = ts;
      const delta = Math.min(0.033, (ts - lastTs) / 1000);
      lastTs = ts;

      update(delta);
      draw();
      rafId = window.requestAnimationFrame(frame);
    };

    const stop = () => {
      running = false;
      releaseInputs();
      lastTs = 0;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const onKeyDown = (event) => handleKeyboard(event, true);
    const onKeyUp = (event) => handleKeyboard(event, false);
    const onWindowBlur = () => {
      releaseInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    canvas.addEventListener('pointermove', handlePointerMove);

    updateScoreUi();
    draw();

    return {
      start: () => {
        if (running) return;
        running = true;
        lastTs = 0;
        rafId = window.requestAnimationFrame(frame);
      },
      stop,
      destroy: () => {
        stop();
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', onWindowBlur);
        canvas.removeEventListener('pointermove', handlePointerMove);
        controlButtons.forEach((button) => {
          button.removeEventListener('pointerdown', onControlPress);
          button.removeEventListener('pointerup', onControlRelease);
          button.removeEventListener('pointerleave', onControlRelease);
          button.removeEventListener('pointercancel', onControlRelease);
        });
      },
    };
  };
})();
