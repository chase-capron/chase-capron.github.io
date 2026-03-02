(() => {
  const ns = (window.ChaseArcade = window.ChaseArcade || {});

  ns.createBattleGame = ({ enemyHp, playerHp, battleLog, moveButtons } = {}) => {
    if (!(enemyHp instanceof HTMLElement) || !(playerHp instanceof HTMLElement) || !(battleLog instanceof HTMLElement)) {
      return {
        start: () => {},
        stop: () => {},
        destroy: () => {},
      };
    }

    const buttons = Array.isArray(moveButtons) ? moveButtons.filter((node) => node instanceof HTMLElement) : [];

    let enemyHealth = 100;
    let playerHealth = 100;
    let active = false;

    const moveText = {
      ship: 'Promptmon used Ship Patch.',
      lint: 'Promptmon used Lint Beam.',
      rollback: 'Promptmon used Rollback.',
      reboot: 'Promptmon used Reboot.',
    };

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
      battleLog.textContent = 'Battle ready.';
      update();
    };

    const onMove = (event) => {
      if (!active) return;

      const move = event.currentTarget?.dataset?.battleMove;
      if (!move || !moveText[move]) return;

      if (enemyHealth <= 0 || playerHealth <= 0) {
        resetBattle();
        return;
      }

      const damage = 12 + Math.floor(Math.random() * 14);
      const counter = 8 + Math.floor(Math.random() * 12);

      enemyHealth -= damage;
      if (enemyHealth > 0) playerHealth -= counter;

      if (enemyHealth <= 0) {
        battleLog.textContent = `${moveText[move]} Wild Debugmon fainted.`;
      } else if (playerHealth <= 0) {
        battleLog.textContent = `${moveText[move]} Promptmon fainted.`;
      } else {
        battleLog.textContent = `${moveText[move]} Wild Debugmon counters.`;
      }

      update();
    };

    buttons.forEach((button) => button.addEventListener('click', onMove));
    resetBattle();

    return {
      start: () => {
        active = true;
        update();
      },
      stop: () => {
        active = false;
        update();
      },
      destroy: () => {
        active = false;
        buttons.forEach((button) => button.removeEventListener('click', onMove));
        update();
      },
    };
  };
})();
