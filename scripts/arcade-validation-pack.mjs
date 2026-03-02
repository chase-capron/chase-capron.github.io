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

  const requiredScripts = [
    'arcade/state.js',
    'arcade/theme-adapter.js',
    'arcade/trigger.js',
    'arcade/shell.js',
    'arcade/games/pong.js',
    'arcade/games/tetris.js',
    'arcade/games/game2048.js',
    'arcade/games/battle.js',
    'arcade/index.js',
  ];

  let previousIndex = -1;
  requiredScripts.forEach((scriptPath) => {
    const marker = `src="${scriptPath}"`;
    const nextIndex = html.indexOf(marker);
    if (nextIndex < 0) {
      fail(`index.html missing arcade script include: ${scriptPath}`);
      return;
    }
    if (nextIndex <= previousIndex) {
      fail(`index.html arcade script order regression around: ${scriptPath}`);
    }
    previousIndex = nextIndex;
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
};

try {
  checkIndexStructure();
  checkTriggerGuardrails();
  checkArcadeSecuritySurface();
  checkShellBehaviorHints();

  if (issues.length) {
    console.error('❌ Arcade phase-5 validation failed:');
    issues.forEach((issue) => console.error(`- ${issue}`));
    process.exitCode = 1;
  } else {
    console.log('✅ Arcade phase-5 validation passed.');
  }
} catch (error) {
  console.error('❌ Arcade phase-5 validation crashed:', error?.message || error);
  process.exitCode = 1;
}
