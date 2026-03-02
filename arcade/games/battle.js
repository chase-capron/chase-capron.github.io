(() => {
  const ns = (window.ChaseArcade = window.ChaseArcade || {});

  const isEditableTarget = (target) => {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  };

  ns.createBattleGame = ({ enemyHp, playerHp, battleLog, moveButtons, battleScene } = {}) => {
    if (!(enemyHp instanceof HTMLElement) || !(playerHp instanceof HTMLElement) || !(battleLog instanceof HTMLElement)) {
      return {
        start: () => {},
        stop: () => {},
        destroy: () => {},
      };
    }

    const buttons = Array.isArray(moveButtons) ? moveButtons.filter((node) => node instanceof HTMLElement) : [];

    const canvas = battleScene instanceof HTMLCanvasElement ? battleScene : null;
    const ctx = canvas?.getContext('2d') || null;

    let enemyHealth = 100;
    let playerHealth = 100;
    let active = false;
    let rafId = null;
    let startedAt = 0;

    const fx = {
      pulse: 0,
      flash: 0,
      side: 'player',
      color: '#9ad1ff',
    };

    const moveConfig = {
      ship: {
        text: 'Promptmon used Ship Patch.',
        damage: [15, 28],
        counter: [7, 14],
        color: '#7ef29a',
      },
      lint: {
        text: 'Promptmon used Lint Beam.',
        damage: [12, 24],
        counter: [8, 15],
        color: '#6fc7ff',
      },
      rollback: {
        text: 'Promptmon used Rollback.',
        damage: [10, 21],
        counter: [4, 11],
        color: '#ffd166',
      },
      reboot: {
        text: 'Promptmon used Reboot.',
        damage: [17, 30],
        counter: [9, 16],
        color: '#ff8fab',
      },
    };

    const randInt = ([min, max]) => min + Math.floor(Math.random() * (max - min + 1));

    const update = () => {
      enemyHp.textContent = String(Math.max(0, enemyHealth));
      playerHp.textContent = String(Math.max(0, playerHealth));
      buttons.forEach((button) => {
        button.disabled = !active;
      });
    };

    const resetBattle = () => {
      enemyHealth = 100;
      playerHealth = 100;
      fx.pulse = 0;
      fx.flash = 0;
      battleLog.textContent = 'Battle ready. Press 1-4 or tap a move.';
      update();
    };

    const triggerFx = (side, color) => {
      fx.side = side;
      fx.color = color;
      fx.pulse = 1;
      fx.flash = 1;
    };

    const onMove = (event) => {
      if (!active) return;

      const move = event.currentTarget?.dataset?.battleMove;
      const config = move ? moveConfig[move] : null;
      if (!move || !config) return;

      if (enemyHealth <= 0 || playerHealth <= 0) {
        resetBattle();
        return;
      }

      const damage = randInt(config.damage);
      const counter = randInt(config.counter);

      enemyHealth -= damage;
      triggerFx('enemy', config.color);

      if (enemyHealth > 0) {
        playerHealth -= counter;
      }

      if (enemyHealth <= 0) {
        battleLog.textContent = `${config.text} Wild Debugmon fainted.`;
      } else if (playerHealth <= 0) {
        triggerFx('player', '#ff6f91');
        battleLog.textContent = `${config.text} Promptmon fainted.`;
      } else {
        triggerFx('player', '#f8abff');
        battleLog.textContent = `${config.text} Wild Debugmon counters for ${counter}.`;
      }

      update();
    };

    const drawSprite = ({ x, y, scale = 1, color = '#fff', flip = false, hurt = 0 }) => {
      if (!ctx || !canvas) return;
      const unit = 6 * scale;
      const px = (col, row, fill = color) => {
        ctx.fillStyle = fill;
        const drawX = flip ? x - (col + 1) * unit : x + col * unit;
        ctx.fillRect(drawX, y + row * unit, unit - 1, unit - 1);
      };

      const tint = hurt > 0 ? '#ffd3de' : color;
      const shadow = hurt > 0 ? '#ff8fab' : '#071225';

      px(0, 0, shadow);
      px(1, 0, shadow);
      px(2, 0, shadow);
      px(3, 0, shadow);
      px(0, 1, shadow);
      px(3, 1, shadow);

      px(1, 1, tint);
      px(2, 1, tint);
      px(0, 2, tint);
      px(1, 2, tint);
      px(2, 2, tint);
      px(3, 2, tint);
      px(1, 3, tint);
      px(2, 3, tint);
      px(0, 4, tint);
      px(3, 4, tint);
    };

    const draw = (ts) => {
      if (!ctx || !canvas) return;

      const t = (ts - startedAt) / 1000;
      const w = canvas.width;
      const h = canvas.height;

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#13144a');
      grad.addColorStop(0.6, '#240b36');
      grad.addColorStop(1, '#080b16');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const horizon = Math.floor(h * 0.62);
      ctx.strokeStyle = 'rgba(154,209,255,0.28)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 16; i += 1) {
        const y = horizon + i * 10;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let i = 0; i < 14; i += 1) {
        const x = (w / 14) * i;
        ctx.beginPath();
        ctx.moveTo(x, horizon);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
      }

      const playerBob = Math.sin(t * 5.2) * 4;
      const enemyBob = Math.cos(t * 4.8) * 4;

      const playerHurt = fx.side === 'player' ? fx.flash : 0;
      const enemyHurt = fx.side === 'enemy' ? fx.flash : 0;

      drawSprite({
        x: Math.round(w * 0.18),
        y: Math.round(horizon - 62 + playerBob),
        scale: 2,
        color: '#84e3ff',
        hurt: playerHurt,
      });
      drawSprite({
        x: Math.round(w * 0.78),
        y: Math.round(horizon - 70 + enemyBob),
        scale: 2.2,
        color: '#ff9dc0',
        flip: true,
        hurt: enemyHurt,
      });

      if (fx.pulse > 0) {
        const fromX = fx.side === 'enemy' ? w * 0.22 : w * 0.78;
        const toX = fx.side === 'enemy' ? w * 0.78 : w * 0.22;
        const y = horizon - 26;
        const alpha = Math.max(0, fx.pulse);
        ctx.strokeStyle = `${fx.color}${Math.round(alpha * 255)
          .toString(16)
          .padStart(2, '0')}`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(fromX, y + Math.sin(t * 14) * 3);
        ctx.lineTo(toX, y + Math.cos(t * 16) * 4);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255,255,255,0.11)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1);
      }

      ctx.fillStyle = '#e7f3ff';
      ctx.font = '700 13px "JetBrains Mono", "SFMono-Regular", monospace';
      ctx.fillText(`Promptmon HP ${Math.max(0, playerHealth)}`, 18, 18);
      ctx.fillText(`Debugmon HP ${Math.max(0, enemyHealth)}`, w - 190, 18);

      fx.pulse = Math.max(0, fx.pulse - 0.07);
      fx.flash = Math.max(0, fx.flash - 0.11);
    };

    const frame = (ts) => {
      if (!active) return;
      draw(ts);
      rafId = window.requestAnimationFrame(frame);
    };

    const onKeyDown = (event) => {
      if (!active) return;
      if (isEditableTarget(event.target)) return;

      const key = String(event.key || '').toLowerCase();
      const index = Number(key);
      if (Number.isInteger(index) && index >= 1 && index <= buttons.length) {
        event.preventDefault();
        buttons[index - 1]?.click();
        return;
      }

      if ((key === ' ' || key === 'enter') && (enemyHealth <= 0 || playerHealth <= 0)) {
        event.preventDefault();
        resetBattle();
      }
    };

    buttons.forEach((button) => button.addEventListener('click', onMove));
    window.addEventListener('keydown', onKeyDown);

    resetBattle();

    return {
      start: () => {
        if (active) return;
        active = true;
        startedAt = performance.now();
        update();
        if (ctx && canvas) {
          draw(startedAt);
          rafId = window.requestAnimationFrame(frame);
        }
      },
      stop: () => {
        active = false;
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
        update();
      },
      destroy: () => {
        active = false;
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
        buttons.forEach((button) => button.removeEventListener('click', onMove));
        window.removeEventListener('keydown', onKeyDown);
        update();
      },
    };
  };
})();
