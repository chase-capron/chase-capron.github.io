(() => {
  const ns = (window.ChaseArcade = window.ChaseArcade || {});

  ns.createPongGame = (canvas) => {
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

    const w = canvas.width;
    const h = canvas.height;
    const ball = { x: w / 2, y: h / 2, vx: 3.2, vy: 2.4, r: 7 };
    const left = { y: h / 2 - 40, h: 80 };
    const right = { y: h / 2 - 40, h: 80 };

    let running = false;
    let rafId = null;

    const resetBall = () => {
      ball.x = w / 2;
      ball.y = h / 2;
      ball.vx = (Math.random() > 0.5 ? 1 : -1) * 3.2;
      ball.vy = 2.4;
    };

    const draw = () => {
      if (!running) return;

      ctx.fillStyle = '#050814';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.setLineDash([6, 10]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      ctx.setLineDash([]);

      left.y += (ball.y - left.h / 2 - left.y) * 0.08;
      right.y += (ball.y - right.h / 2 - right.y) * 0.08;

      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.y < ball.r || ball.y > h - ball.r) {
        ball.vy *= -1;
      }

      const hitLeft = ball.x - ball.r < 24 && ball.y > left.y && ball.y < left.y + left.h;
      const hitRight = ball.x + ball.r > w - 24 && ball.y > right.y && ball.y < right.y + right.h;

      if (hitLeft || hitRight) {
        ball.vx *= -1.03;
        ball.vy += Math.random() * 1.2 - 0.6;
      }

      if (ball.x < -40 || ball.x > w + 40) {
        resetBall();
      }

      ctx.fillStyle = '#9ad1ff';
      ctx.fillRect(14, left.y, 10, left.h);
      ctx.fillRect(w - 24, right.y, 10, right.h);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      rafId = window.requestAnimationFrame(draw);
    };

    const stop = () => {
      running = false;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    return {
      start: () => {
        if (running) return;
        running = true;
        draw();
      },
      stop,
      destroy: () => {
        stop();
      },
    };
  };
})();
