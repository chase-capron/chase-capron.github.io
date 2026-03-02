# Retro Handheld Phase 3/5 — Animated Cartridge Switching + Transition State Machine

Date: 2026-03-02 (America/New_York)  
Repo: `chase-capron.github.io`

## Goal completed

Implemented a transition-driven shell lifecycle and cartridge-style game switching flow so game changes feel like swapping carts on a handheld while preserving stealth unlock, accessibility, and existing game APIs.

## What changed

### 1) `arcade/shell.js` — explicit transition state machine

Added shell phase lifecycle:

- `closed -> opening -> open -> switching -> open -> closing -> closed`

Key behavior:

- Open/close now run timed phase transitions (`is-opening` / `is-closing`) with cleanup guards.
- Tab changes while open run through a switch timeline instead of immediate hard swap.
- Tab interaction is gated during switching to prevent double-trigger regressions.
- Rapid re-selection is handled safely via queued switch intent.
- Escape-close, focus trap, focus return, and backdrop/close button hooks remain intact.

### 2) Cartridge swap animation sequencing

When motion is allowed:

1. **Powerdown phase** (~90ms)
2. **Cartridge shift phase** (~120ms)
3. **Screen warm-in phase** (~140ms)

Total switch target remains ~350ms.

Runtime flags on shell root now expose transition state for styling:

- `data-arcade-phase`
- `data-arcade-switch-phase`
- `data-arcade-switch-to`

### 3) Reduced-motion behavior

If `prefers-reduced-motion: reduce` is enabled:

- Switch flow downgrades to a short crossfade (~110ms)
- Lift/drop and warm-in animation effects are disabled
- State announcements and accessibility semantics remain unchanged

### 4) `styles.css` — phase-driven transition styling

Added transition styles for:

- Shell open/close classes (`.is-opening`, `.is-closing`)
- Cartridge target/active motion in the strip
- Screen powerdown scanline effect + warm-in recovery
- Switching interaction lock (`.is-switching`)
- Reduced-motion override paths

### 5) Validation updates

Updated `scripts/arcade-validation-pack.mjs` to verify phase-3 architecture hints:

- shell phase states present in controller
- transition state flags present (`data-arcade-switch-phase`)
- transition selector coverage in CSS

## State persistence (no regression)

- Existing persisted state contract remains stable:
  - discovery flag
  - active tab
  - unlock metadata
- Active tab still persists through `arcade/state.js` and restores on next load.

## Verification

```bash
node scripts/arcade-validation-pack.mjs
# ✅ Arcade handheld validation passed.
```
