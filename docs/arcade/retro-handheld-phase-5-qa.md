# Retro Handheld Phase 5/5 — Final Polish + QA

Date: 2026-03-02 10:53 (America/New_York)  
Scope: `chase-capron.github.io`  
Goal: Final polish on handheld 3D visuals, game-switching feel, playability/performance, and reduced-motion/mobile behavior for Arcade.

## What changed in Phase 5

### 1) Arcade shell motion profiling (full / compact / reduced)

- Updated `arcade/shell.js` with a 3-tier motion model:
  - **full** (desktop/non-reduced): existing timings retained for premium visual transitions.
  - **compact** (max-width ≤ 760px or `pointer: coarse`): slightly shorter transitions for mobile and low-precision input.
  - **reduced** (`prefers-reduced-motion: reduce`): shortest timings + crossfade-only switch profile.
- Added live token on shell root: `data-arcade-motion="full|compact|reduced"`.
- Motion tokens now drive CSS timing variables at runtime (`--arcade-open-ms`, `--arcade-close-ms`, `--arcade-switch-*`).
- Added compact-motion query listeners so transition profile updates live as breakpoints/input-model change.
- Added lightweight compact-motion visual damping for handheld feel:
  - lower shell tilt (`.hh-device`) in compact mode
  - gentler tab target movement in compact mode
- Theme sync now defers through a small scheduler in `app.js` to ensure visual consistency after stylesheet swap and paint.

### 2) 3D dino gameplay polish + reduced-motion + mobile playability

- Updated `arcade/games/dino3d.js`:
  - Added runtime motion preference hooks:
    - `(prefers-reduced-motion: reduce)`
    - `(max-width: 760px), (pointer: coarse)`
  - Added buffered jump input (`JUMP_BUFFER_SEC`) for tap/keyboard responsiveness.
  - Reduced motion fallback behavior:
    - status copy switches to reduced-motion wording
    - obstacle z jitter removed
    - camera/object spin damped
    - ground wave movement removed
    - running bob removed
  - Compact mode performance fallback:
    - fewer cactus triangle draws via `triStride`
    - fewer horizon lines
  - Added mobile-friendly dino control and HUD polish:
    - larger/touch target button styles
    - tighter mobile canvas height cap
  - Hooked jump controls on `click` + pointerdown, guard with running state.
- Added dino tab into state allowlist to ensure cartridge state persists:
  - `arcade/state.js`: `ALLOWED_TABS` now includes `dino3d`.

### 3) Mobile and reduced-motion QA checks added to automation

- Extended `scripts/arcade-validation-pack.mjs` with:
  - `checkDinoGameplayPolishHints` (3D motion/perf markers)
  - `checkMobileReducedMotionStyles` (compact/reduced CSS markers)
  - `checkStateCoverage` (dino tab persistence coverage)
  - `checkShellBehaviorHints` now verifies compact-motion query + shell token presence.

## Tuning knobs (adjustable in code)

### `arcade/shell.js`

- `MOTION.full`
  - `openMs: 220`
  - `closeMs: 180`
  - `powerDownMs: 90`
  - `cartridgeMs: 120`
  - `warmMs: 140`
- `MOTION.compact`
  - `openMs: 170`
  - `closeMs: 140`
  - `powerDownMs: 70`
  - `cartridgeMs: 92`
  - `warmMs: 108`
- `MOTION.reduced`
  - `openMs: 120`
  - `closeMs: 100`
  - `crossfadeMs: 110`
- Compact/low-motion queries:
  - compact: `(max-width: 760px), (pointer: coarse)`
  - reduced: `(prefers-reduced-motion: reduce)`

### `arcade/games/dino3d.js`

- Jump buffer window: `JUMP_BUFFER_SEC = 0.14`
- Reduced-motion status text and draw logic toggles keyed off `prefersReducedMotion`
- Obstacle animation stride: `triStride` (compact/reduced => 2, else 1)
- Ground motion lines: 18 (full), 12 (compact)

## QA runbook + outcomes

### Automated checks

```bash
node scripts/site-hygiene-check.mjs
node scripts/arcade-validation-pack.mjs
for f in app.js theme-init.js $(find arcade -type f -name '*.js' | sort); do
  node --check "$f"
done
```

- ✅ `site-hygiene-check`: pass
- ✅ `arcade-validation-pack`: pass
- ✅ JS syntax sweep (`node --check`): pass

### Manual QA (browser)

- Open shell, switch to **Dino 3D** pane.
  - Confirm dino tab activates and HUD renders: score/best/status.
- Tab switching feel:
  - Confirm open/close and switch transitions remain smooth with shell states.
  - Confirm data-arcade-switch attributes + timing vars update.
- Compact mode behavior (`390x844` viewport):
  - shell reports `data-arcade-motion="compact"`
  - reduced transition (`--arcade-open-ms`) observed around `170ms`
  - Dino canvas gets `max-height: min(48vh, 260px)`
  - Dino button remains touch-comfortable (48px target)
- Reduced-motion simulation (`prefers-reduced-motion: reduce`):
  - shell reports `data-arcade-motion="reduced"`
  - `--arcade-open-ms` observed at `120ms`
  - `--arcade-switch-crossfade-ms` observed at `110ms`
  - status text switched to reduced-motion variant
- Gameplay/playability smoke:
  - Dino tab starts with active loop after open
  - Jump interaction works repeatedly
  - score increments during run and persists best value

## Final notes

- All phase-5 polish and regression checks are complete and passing.
- No behavior change was made to the hidden 10-tap unlock logic; this phase focused strictly on UX polish, transitions, and accessibility/performance fallbacks.
- Recommend keeping the compact-motion thresholds and `triStride` behavior as they are; if older devices still show frame jitter, the next safe steps are:
  1) lower `MOTION.compact` timings further, 2) increase `triStride` for compact/reduced, 3) reduce `lineCount` in compact ground rendering.
- No external dependencies added and no network-only dependencies introduced in this phase.
