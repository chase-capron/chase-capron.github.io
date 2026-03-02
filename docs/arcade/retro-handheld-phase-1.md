# Retro Handheld Phase 1/5 — Art Direction + Implementation Blueprint

Date: 2026-03-02 (America/New_York)  
Repo: `chase-capron.github.io`  
Scope: Audit current hidden arcade UI and define the implementation-ready design system for a Game Boy-inspired 3D handheld shell.

## 1) Goal

Redesign the hidden arcade from a flat modal panel into a tactile retro handheld interface while preserving:

- stealth unlock behavior,
- existing game logic modules,
- accessibility and keyboard/touch usability,
- current security guardrails (local-only, no dynamic code execution/network calls from arcade modules).

This Phase 1 deliverable is **design + engineering blueprint only** (no runtime UI rewrite yet).

---

## 2) Audit of current hidden arcade UI (as implemented)

### What exists now

- Hidden unlock path is wired via `Legacy Device Builds` icon tap sequence (10 taps).
- Shell opens as a centered modal overlay (`#retroArcade`) with backdrop blur.
- Game selection is tab-based (`Pong`, `Tetris`, `2048`, `Battle`).
- Each game pane owns its own HUD and touch controls.
- Focus trap, Escape-close, backdrop-close, and body scroll lock are implemented.
- Theme adapter maps root theme tokens into arcade token aliases.

### Current strengths

- Solid architecture split (`state`, `trigger`, `shell`, `theme-adapter`, `games/*`).
- Good stealth + fallback navigation behavior.
- Accessibility baseline is already strong (dialog semantics, tab roles, live announcer).
- Validation pack enforces critical safety/security contracts.

### Current visual/interaction gaps (targeted by handheld redesign)

- Shell is visually flat; no meaningful depth hierarchy (body/bezel/glass are not distinct layers).
- Tab pills feel like web UI, not physical controls.
- Game switching is immediate pane toggle; no tactile or “device-like” transition metaphor.
- Lighting/shadow language is generic modal styling, not hardware-inspired.
- Screen area does not communicate CRT/LCD depth, glass reflection, or phosphor texture.

---

## 3) Art direction pillars

1. **Pocket hardware first**  
   The arcade should read as a handheld object sitting above the page, not a generic dialog.

2. **Subtle 3D, not skeuomorphic overload**  
   Realistic enough to feel tactile; restrained enough to match the site’s clean aesthetic.

3. **Physical affordances over abstract controls**  
   D-pad, A/B cluster, Start/Select, speaker vents, status LED cues.

4. **Game switch as cartridge metaphor**  
   Switching titles should feel like selecting/swapping cartridges, not clicking browser tabs.

5. **Theme-compatible industrial design**  
   Existing site themes recolor accents/light spill, while body geometry remains consistent.

---

## 4) 3D handheld interface system

### 4.1 Spatial layer stack (front-to-back)

1. **Backdrop layer** — existing dim/blur field; keep for focus.
2. **Device silhouette** — rounded rectangular shell body with subtle asymmetry.
3. **Bezel recess** — inset frame around screen using inner shadows and edge highlights.
4. **Screen glass** — reflective top layer with moving glare and faint dust/noise texture.
5. **Display plane** — actual game canvases/DOM boards, slightly recessed (`translateZ(-6px)`).
6. **Control deck** — D-pad + A/B + utility controls with press states.

### 4.2 Geometry tokens (new CSS variables)

Add a dedicated token namespace on `.arcade-shell`:

- `--hh-shell-radius: 28px`
- `--hh-shell-depth: 18px`
- `--hh-bezel-radius: 14px`
- `--hh-screen-inset: 14px`
- `--hh-screen-depth: 6px`
- `--hh-control-size: clamp(42px, 5.2vw, 56px)`
- `--hh-shadow-elev-1/2/3` (layered shadow stack)

### 4.3 Responsive size envelope

- Desktop: device width `min(920px, calc(100vw - 32px))`
- Tablet: `min(760px, calc(100vw - 20px))`
- Mobile portrait: full-bleed safe-area aware shell (`calc(100vh - env(safe-area-inset-*))` bounded)
- Maintain minimum control hit target of `44px`.

---

## 5) Lighting + material system

### 5.1 Material zones

- **Shell plastic:** matte gradient + fine grain noise (CSS-only, no heavy image assets).
- **Bezel ring:** slightly darker, higher contrast edge to frame screen cavity.
- **Glass:** gloss streak + diagonal specular pass (pseudo-element).
- **Buttons:** semi-gloss with depressed active state and directional shadow shift.

### 5.2 Lighting model (CSS-driven)

- Key light from top-left.
- Rim light on right edge for separation.
- Ambient occlusion in seam between bezel and shell.
- Theme accent only on micro-details (LED, active button ring, cartridge label underline).

### 5.3 Theme mapping extension

Expand `arcade/theme-adapter.js` token output to include:

- `--hh-accent`, `--hh-shell-hi`, `--hh-shell-lo`, `--hh-glow`, `--hh-screen-tint`.

No per-theme geometry changes; only color/material tuning.

---

## 6) Controls system (physical metaphor)

### 6.1 Replace top tabs with hardware selector model

- Primary game switching moves to a **cartridge strip** above screen (small labeled slots).
- Optional mirrored quick selector remains accessible for keyboard/screen-reader users.

### 6.2 Physical control mapping

- Left: D-pad (up/down/left/right)
- Right: A/B (context-aware action buttons)
- Bottom center: Start/Select (pause/reset/context)

### 6.3 Input model requirements

- Preserve keyboard mappings already implemented per game.
- Preserve touch and pointer support.
- Maintain roving tabindex + clear focus ring on all interactive controls.

---

## 7) Transition language + game-switch metaphor

### 7.1 Device-level open/close

- Open: shell lifts from backdrop (`translateY(10px)->0`, `scale(0.985)->1`, 220ms).
- Close: reverse with slight dim fade.

### 7.2 Game switch: “cartridge swap” sequence (default motion)

1. Active screen powers down to horizontal scan line (90ms).
2. Cartridge label strip animates to next slot (120ms).
3. Screen warms back in with phosphor fade (140ms).
4. New game pane becomes interactive.

Total target: ~350ms.

### 7.3 Reduced motion behavior

If `prefers-reduced-motion: reduce`:

- No simulated camera/depth movement.
- Replace with 80–120ms opacity crossfade only.
- Keep state announcements intact via aria-live.

---

## 8) Implementation blueprint (file-level)

### 8.1 `index.html`

- Replace current flat shell internals with handheld scaffold:
  - `.hh-device`
  - `.hh-screen-bay`
  - `.hh-glass`
  - `.hh-cartridge-strip`
  - `.hh-controls`
- Keep `#retroArcade`, `role="dialog"`, `aria-modal`, and close hooks.
- Preserve game pane IDs and relationships for compatibility.

### 8.2 `styles.css`

- Introduce `/* Retro Handheld Shell */` section.
- Add geometry/material/lighting tokens + layered pseudo-elements.
- Re-skin existing game panes inside screen bay (no canvas logic changes).
- Add transition classes:
  - `.is-opening`, `.is-closing`, `.is-switching`.

### 8.3 `arcade/shell.js`

- Add explicit shell animation state machine:
  - `closed -> opening -> open -> switching -> open -> closing -> closed`
- Gate focus and game start/stop around transition lifecycle callbacks.
- Keep Escape handling, focus trap, and close button/backdrop behavior.

### 8.4 `arcade/index.js`

- Keep unlock behavior unchanged.
- Update tab/switch integration to drive cartridge strip UI.
- Maintain announcer updates (`"<game> selected"`) after switch completion.

### 8.5 `arcade/theme-adapter.js`

- Extend token output for material/lighting variables.
- Ensure fallback values remain safe if a theme token is missing.

### 8.6 Tests and validation updates

Update `scripts/arcade-validation-pack.mjs` for new structure checks:

- Ensure handheld scaffold classes exist.
- Ensure accessibility hooks remain present.
- Ensure trigger guardrails + blocked pattern checks remain unchanged.

---

## 9) Non-negotiable constraints

1. **Stealth trigger must remain unchanged in behavior**
   - 10 rapid taps to unlock.
   - Single-tap fallback navigation still works.

2. **Security surface remains local-only**
   - No `fetch`, `XMLHttpRequest`, `WebSocket`, `eval`, `new Function`, or unsafe HTML injection.

3. **Accessibility parity or better**
   - Dialog semantics, Escape-close, focus trap, roving focus, and live announcements must persist.

4. **Performance budget**
   - Target 60fps on modern desktop; stable 30fps floor on mobile.
   - Avoid heavy bitmap textures/video overlays.
   - Keep repaint-heavy effects to pseudo-elements and transform/opacity animations.

5. **Game module contract stability**
   - `games/*` APIs (`start/stop/destroy`) stay unchanged.
   - No game logic rewrites in this phase.

---

## 10) Phase 1 sign-off criteria

Phase 1 is complete when:

- Current UI audit is documented with clear gaps.
- Handheld design language is specified (geometry, depth, lighting, controls, transitions).
- File-level implementation plan is explicit.
- Constraints are listed and testable.
- Phase 2 can begin without additional art-direction decisions.

---

## 11) Suggested phase sequencing (remaining 4 phases)

- **Phase 2:** Build handheld HTML/CSS scaffold + static visual shell.
- **Phase 3:** Wire transition state machine + cartridge switch behavior.
- **Phase 4:** Per-game HUD/control skin pass + responsive tuning.
- **Phase 5:** QA/security/perf/accessibility regression + docs finalization.
