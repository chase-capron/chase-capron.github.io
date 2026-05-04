#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const issues = [];

const readUtf8 = (relPath) => readFileSync(path.join(repoRoot, relPath), 'utf8');
const fail = (message) => issues.push(message);

const walkFiles = (startDir, output = []) => {
  for (const entry of readdirSync(startDir)) {
    const full = path.join(startDir, entry);
    const info = statSync(full);
    if (info.isDirectory()) {
      walkFiles(full, output);
      continue;
    }
    output.push(full);
  }
  return output;
};

const checkIndexStructure = () => {
  const html = readUtf8('index.html');
  const app = readUtf8('app.js');

  const requiredScripts = [
    'arcade/state.js',
    'arcade/theme-adapter.js',
    'arcade/trigger.js',
    'arcade/shell.js',
    'arcade/games/pong.js',
    'arcade/games/tetris.js',
    'arcade/games/game2048.js',
    'arcade/games/snake.js',
    'arcade/games/dino3d-assets.js',
    'arcade/games/dino3d.js',
    'arcade/index.js',
  ];

  let previousIndex = -1;
  requiredScripts.forEach((scriptPath) => {
    const nextIndex = app.indexOf(`'${scriptPath}'`);
    if (nextIndex < 0) {
      fail(`app.js missing lazy arcade script path: ${scriptPath}`);
      return;
    }
    if (nextIndex <= previousIndex) {
      fail(`app.js lazy arcade script order regression around: ${scriptPath}`);
    }
    previousIndex = nextIndex;
  });

  requiredScripts.forEach((scriptPath) => {
    if (html.includes(`src="${scriptPath}"`)) {
      fail(`index.html should lazy-load arcade script instead of eager include: ${scriptPath}`);
    }
  });

  if (!/Legacy Device Builds/.test(html)) {
    fail('index.html missing Legacy Device Builds trigger label');
  }

  if (!/<a[^>]*href="projects\/midi-home-control\/"[^>]*>[\s\S]*?Legacy Device Builds/.test(html)) {
    fail('Legacy Device Builds card href regression (expected projects/midi-home-control/)');
  }

  if (!/id="retroArcade"[^>]*aria-hidden="true"/.test(html)) {
    fail('Arcade shell should be hidden by default (id="retroArcade" aria-hidden="true")');
  }

  if (!/class="arcade-shell__panel"[\s\S]*?role="dialog"/.test(html)) {
    fail('Arcade panel should expose role="dialog"');
  }

  if (!/data-arcade-close/.test(html)) {
    fail('Arcade close controls missing data-arcade-close hook');
  }

  const handheldScaffold = ['hh-device', 'hh-cartridge-strip', 'hh-screen-bay', 'hh-screen-bezel', 'hh-screen-depth', 'hh-controls'];
  handheldScaffold.forEach((className) => {
    if (!new RegExp(`class="[^"]*${className}[^"]*"`).test(html)) {
      fail(`index.html missing retro handheld scaffold class: ${className}`);
    }
  });

  if (!/class="arcade-tabs[^"]*"[^>]*role="tablist"/.test(html)) {
    fail('Arcade tablist role missing on cartridge strip nav');
  }

  if (!/data-arcade-tab="dino3d"/.test(html)) {
    fail('index.html missing Dino 3D cartridge tab (data-arcade-tab="dino3d")');
  }

  if (!/data-arcade-pane="dino3d"/.test(html)) {
    fail('index.html missing Dino 3D pane (data-arcade-pane="dino3d")');
  }

  if (!/id="arcadeDino3d"/.test(html)) {
    fail('index.html missing Dino 3D canvas id="arcadeDino3d"');
  }

  if (!/data-dino3d-control="jump"/.test(html)) {
    fail('index.html missing Dino 3D jump control hook (data-dino3d-control="jump")');
  }

  if (!/data-arcade-tab="snake"/.test(html) || !/Caterpillar/.test(html)) {
    fail('index.html missing Caterpillar Snake cartridge tab');
  }

  if (!/id="arcadeSnake"/.test(html) || !/data-snake-control="up"/.test(html)) {
    fail('index.html missing Caterpillar Snake canvas or controls');
  }
};

const checkTriggerGuardrails = () => {
  const trigger = readUtf8('arcade/trigger.js');
  const index = readUtf8('arcade/index.js');

  if (!/querySelector\('\.hardware-card__icon'\) \|\| card/.test(index)) {
    fail('arcade/index.js should scope the unlock trigger to the Legacy Device icon before card fallback');
  }

  if (!/fallbackNavigate/.test(trigger)) {
    fail('arcade/trigger.js missing fallback navigation path for single tap');
  }

  if (!/window\.location\.assign\(/.test(trigger)) {
    fail('arcade/trigger.js should restore same-tab navigation with window.location.assign');
  }

  if (!/window\.open\(/.test(trigger)) {
    fail('arcade/trigger.js should preserve target="_blank" behavior via window.open');
  }

  if (!/taps === 1/.test(trigger)) {
    fail('arcade/trigger.js should only auto-navigate for single-tap fallback');
  }

  if (!/requiredTaps\s*=\s*10/.test(trigger)) {
    fail('arcade/trigger.js requiredTaps default changed unexpectedly (expected 10)');
  }
};

const checkArcadeSecuritySurface = () => {
  const arcadeDir = path.join(repoRoot, 'arcade');
  const files = walkFiles(arcadeDir).filter((filePath) => filePath.endsWith('.js'));

  const blockedPatterns = [
    { regex: /\beval\s*\(/, label: 'eval()' },
    { regex: /new\s+Function\s*\(/, label: 'new Function()' },
    { regex: /insertAdjacentHTML\s*\(/, label: 'insertAdjacentHTML()' },
    { regex: /innerHTML\s*=/, label: 'innerHTML assignment' },
    { regex: /XMLHttpRequest/, label: 'XMLHttpRequest' },
    { regex: /\bfetch\s*\(/, label: 'fetch()' },
    { regex: /new\s+WebSocket\s*\(/, label: 'WebSocket' },
  ];

  files.forEach((filePath) => {
    const rel = path.relative(repoRoot, filePath);
    const src = readFileSync(filePath, 'utf8');

    blockedPatterns.forEach(({ regex, label }) => {
      if (regex.test(src)) {
        fail(`${rel} contains blocked pattern: ${label}`);
      }
    });
  });

  const storageKeyRegex = /(?:const|let|var)\s+STORAGE_KEY\s*=\s*['"]([^'"]+)['"]/g;

  files.forEach((filePath) => {
    const rel = path.relative(repoRoot, filePath);
    const src = readFileSync(filePath, 'utf8');

    let match;
    while ((match = storageKeyRegex.exec(src)) !== null) {
      const key = String(match[1] || '').trim();
      if (!key.startsWith('cc_arcade_')) {
        fail(`${rel} STORAGE_KEY must be namespaced with cc_arcade_: ${key}`);
      }
    }
  });
};

const checkShellBehaviorHints = () => {
  const shell = readUtf8('arcade/shell.js');

  if (!/event\.key === 'Escape'/.test(shell)) {
    fail('arcade/shell.js missing Escape-close behavior');
  }

  if (!/document\.body\.classList\.add\('arcade-open'\)/.test(shell)) {
    fail('arcade/shell.js missing body lock class on open');
  }

  if (!/document\.body\.classList\.remove\('arcade-open'\)/.test(shell)) {
    fail('arcade/shell.js missing body lock cleanup on close');
  }

  const requiredPhases = ['closed', 'opening', 'open', 'switching', 'closing'];
  requiredPhases.forEach((phase) => {
    if (!shell.includes(`'${phase}'`)) {
      fail(`arcade/shell.js missing shell phase state: ${phase}`);
    }
  });

  if (!/data-arcade-switch-phase/.test(shell)) {
    fail('arcade/shell.js missing data-arcade-switch-phase state flagging for cartridge transitions');
  }

  if (!/setTabsBusy\(/.test(shell)) {
    fail('arcade/shell.js missing tab gating during transition lifecycle');
  }

  if (!/max-width: 760px/.test(shell) || !/pointer: coarse/.test(shell)) {
    fail('arcade/shell.js missing compact-motion media query guard for mobile/coarse pointers');
  }

  if (!/dataset\.arcadeMotion/.test(shell)) {
    fail('arcade/shell.js missing data-arcade-motion state token for motion profile debugging');
  }
};

const checkThemeAdapterCoverage = () => {
  const adapter = readUtf8('arcade/theme-adapter.js');

  const requiredHandheldTokens = [
    '--hh-accent',
    '--hh-shell-hi',
    '--hh-shell-lo',
    '--hh-glow',
    '--hh-screen-tint',
  ];

  requiredHandheldTokens.forEach((token) => {
    if (!adapter.includes(token)) {
      fail(`arcade/theme-adapter.js missing handheld token mapping: ${token}`);
    }
  });
};

const checkStateCoverage = () => {
  const state = readUtf8('arcade/state.js');
  if (!/dino3d/.test(state)) {
    fail('arcade/state.js missing dino3d in allowed tab persistence set');
  }
  const legacyBattleId = 'poke' + 'mon';
  if (!/snake/.test(state) || state.includes(legacyBattleId)) {
    fail('arcade/state.js should include snake and remove the legacy battle tab from allowed tab persistence set');
  }
};

const checkSnakeGameCoverage = () => {
  const snake = readUtf8('arcade/games/snake.js');
  const requiredMarkers = [
    'createSnakeGame',
    'cc_arcade_snake_best',
    'data-snake-control',
    'ArrowUp',
    'leaf',
    'spider',
    'rock',
  ];

  requiredMarkers.forEach((marker) => {
    if (!snake.includes(marker)) {
      fail(`arcade/games/snake.js missing Caterpillar marker: ${marker}`);
    }
  });
};

const checkSwitchStyles = () => {
  const css = readUtf8('styles.css');

  const requiredSelectors = [
    '.arcade-shell.is-opening .hh-device',
    '.arcade-shell.is-closing .hh-device',
    '.arcade-shell.is-switching',
    'data-arcade-switch-phase="powerdown"',
    'data-arcade-switch-phase="warm"',
  ];

  requiredSelectors.forEach((selector) => {
    if (!css.includes(selector)) {
      fail(`styles.css missing phase-3 transition selector: ${selector}`);
    }
  });
};

const checkDinoGameplayPolishHints = () => {
  const dino = readUtf8('arcade/games/dino3d.js');

  const requiredMarkers = [
    'prefers-reduced-motion: reduce',
    'JUMP_BUFFER_SEC',
    'jumpBuffer',
    '(max-width: 760px), (pointer: coarse)',
    'triStride',
  ];

  requiredMarkers.forEach((marker) => {
    if (!dino.includes(marker)) {
      fail(`arcade/games/dino3d.js missing phase-5 gameplay/perf marker: ${marker}`);
    }
  });
};

const checkMobileReducedMotionStyles = () => {
  const css = readUtf8('styles.css');

  const requiredMarkers = [
    '.arcade-shell[data-arcade-motion="compact"] .arcade-tab.is-target',
    '@media (max-width: 520px)',
    '[data-control-group="dino3d"] button',
    '@media (prefers-reduced-motion: reduce)',
    '.hh-glass',
  ];

  requiredMarkers.forEach((marker) => {
    if (!css.includes(marker)) {
      fail(`styles.css missing phase-5 mobile/reduced-motion marker: ${marker}`);
    }
  });
};

const checkAssetAttributionDoc = () => {
  const attribution = readUtf8('docs/arcade/asset-attribution.md');

  const requiredMarkers = [
    'Quaternius',
    'OpenGameArt',
    'CC0',
    'trex-quaternius.obj',
    'cactus-oga.obj',
    'opengameart-cactus-license.txt',
  ];

  requiredMarkers.forEach((marker) => {
    if (!attribution.includes(marker)) {
      fail(`docs/arcade/asset-attribution.md missing marker: ${marker}`);
    }
  });
};

try {
  checkIndexStructure();
  checkTriggerGuardrails();
  checkArcadeSecuritySurface();
  checkShellBehaviorHints();
  checkThemeAdapterCoverage();
  checkStateCoverage();
  checkSnakeGameCoverage();
  checkSwitchStyles();
  checkDinoGameplayPolishHints();
  checkMobileReducedMotionStyles();
  checkAssetAttributionDoc();

  if (issues.length) {
    console.error('❌ Arcade handheld validation failed:');
    issues.forEach((issue) => console.error(`- ${issue}`));
    process.exitCode = 1;
  } else {
    console.log('✅ Arcade handheld validation passed.');
  }
} catch (error) {
  console.error('❌ Arcade handheld validation crashed:', error?.message || error);
  process.exitCode = 1;
}
