# Baggage Loop Animation — Phase 1/5 Research + Design

Date: 2026-03-02  
Repo: `chase-capron.github.io`  
Scope: Analyze current hero marquee baggage behavior and define a true continuous-loop simulation plan.

---

## 1) Current Implementation Audit (What exists now)

### Markup
- `index.html` contains one set of `.project-tile` cards inside `.hero-marquee__track`.
- Runtime JS duplicates that set once (for seamless CSS looping) and marks clones `aria-hidden`.

### Motion system in use
- **Belt motion:** CSS keyframe `marquee` on `.hero-marquee__track` (`translateX(0 -> -50%)` over 20s linear infinite).
- **Drop-in effect:** each tile gets one startup animation (`marqueeBaggageDrop`, 620ms), staggered by JS delay.
- **Random bump effect:** JS randomly picks two tiles every 2.4s and toggles a short `tileBump` class.

### Behavioral characteristics
- Movement is **track-level translation**, not per-bag simulation.
- “Collisions” are visual only (random class toggles), not based on proximity/overlap.
- No true chute spawn stream; all tiles already exist on load.
- Recycling is performed by CSS-looped duplicate content, not stateful object reuse.

---

## 2) Why it doesn’t feel like a true baggage system

1. **No world state:** cards do not own position/velocity; they inherit one shared transform.
2. **No causal contact:** bump timing is random and can fire for distant tiles.
3. **No push-through mechanics:** interactions don’t transfer momentum across neighbors.
4. **Loop seam depends on exact clone width math:** visually okay, but not physically continuous.
5. **Startup-only drop:** chute fantasy exists for first paint only, then disappears.

---

## 3) Target Behavior (Definition of Done for final system)

A continuous baggage-claim illusion where:
- Bags spawn from a virtual chute at controlled cadence.
- Belt drives each bag at stable baseline velocity.
- Bags make small, local, plausible micro-collisions.
- User push/hover interactions create pressure waves through neighboring bags.
- Bags recycle without visible seams, snapping, or DOM churn.
- Reduced-motion users get a clean non-sim fallback.

---

## 4) Proposed Simulation Architecture

## 4.1 Simulation model (per-bag, not per-track)
Use a lightweight 1D+ micro-2D model per tile:

```ts
BagState {
  id: number;
  el: HTMLElement;
  width: number;
  x: number;       // belt position (px)
  y: number;       // micro vertical offset / landing bounce
  vx: number;      // horizontal velocity
  vy: number;      // vertical velocity
  rot: number;     // small rotational wobble
  vrot: number;
  mass: number;
  phase: 'drop' | 'belt' | 'recycle';
  bornAtMs: number;
}
```

- Render each bag with `transform: translate3d(x, y, 0) rotate(rot)`.
- Keep belt itself visually static; animate individual bags.

## 4.2 Time stepping
- Use `requestAnimationFrame` with **fixed-step accumulator** (e.g., 1/120s step, max catch-up clamp).
- This removes frame-rate-dependent physics drift and jitter.

## 4.3 Belt velocity
- Set target belt speed `beltV` (initial tuning target: ~72–84 px/s, close to current perceived speed).
- Smooth convergence per bag: `vx += (beltV - vx) * beltFriction * dt`.
- Allow small speed variance per bag (±3%) so the line never looks robotic.

## 4.4 Chute spawn cadence
Spawn should be cadence-driven, not interval-only.

Inputs:
- `spawnX`: right-side chute entry (offscreen + margin)
- `desiredGapPx`: target center-to-center spacing (e.g., 86px mean)
- `gapJitterPx`: random jitter (e.g., ±26px)
- `minSpawnCooldownMs` (e.g., 220ms)

Rule:
- Only spawn when last bag has advanced enough from chute by `desiredGapPx + jitter`.
- Backstop with cooldown to avoid burst spawns during frame hiccups.

This yields natural throughput tied to actual belt motion.

## 4.5 Micro-collisions (local + plausible)
Each step:
1. Sort active bags by `x`.
2. For neighbor pairs `(i, i+1)` compute overlap:
   - `overlap = (xi + wi + gapMin) - xj`
3. If overlap > 0:
   - Positional correction split by mass ratio.
   - Impulse transfer (1D elastic-lite with damping).
   - Tiny vertical/rotational kick for texture.

Use strong damping so collisions read as conveyor nudges, not pinball.

## 4.6 Push-through interaction
Add interaction field centered on pointer or dragged bag:
- On hover/drag, nearest bag receives impulse.
- Excess overlap cascades through neighbors (pressure propagation).
- Clamp max impulse so cards remain readable/clickable.

Result: user “pushes” one bag, neighboring bags compress then release.

## 4.7 Non-janky recycling
When bag exits left beyond kill margin:
- Reuse same DOM node from pool (no delete/create churn).
- Reset state to chute spawn:
  - `x = spawnX + randomOffset`
  - `y = dropStartY`
  - `phase = 'drop'`
  - randomized micro params (`mass`, `wobble`, `landingBounce`)
- Preserve focus safety: recycle only non-focused elements; if focused, defer recycle until blur.

This gives a true endless stream with stable memory/perf.

---

## 5) Rendering + Accessibility Strategy

- Keep semantic source list once in HTML (already true).
- Simulation runs only when:
  - `prefers-reduced-motion: no-preference`
  - hero marquee is in viewport (pause offscreen)
- Reduced motion fallback:
  - horizontal scroll + snap (already present), no physics loop.
- Interaction safety:
  - preserve pointer/click targets
  - no layout shifts (`transform` only)
  - avoid focus trap during recycle

---

## 6) Implementation Plan (Phases 2–5)

## Phase 2 — Engine scaffold + parity
- Build `BaggageLoopEngine` module in `app.js` (or split file if desired).
- Convert from track animation to per-bag transform loop.
- Maintain current visual style; keep existing cards/icons/text unchanged.
- Add guardrails: pause on tab hidden / offscreen.

Deliverable: same look, now state-driven movement.

## Phase 3 — Spawn + recycle system
- Implement chute cadence logic and object pool recycling.
- Add landing/drop behavior on each spawn/recycle.
- Remove CSS `marquee` keyframe dependency.

Deliverable: true infinite stream with no seam.

## Phase 4 — Collisions + push-through interactions
- Add neighbor collision solver (damped impulses).
- Add hover/drag impulse field and pressure propagation.
- Tune for subtlety and readability.

Deliverable: believable micro physics + interactive nudging.

## Phase 5 — Tuning, QA, fallback hardening
- Parameter tuning (speed, gap, damping, bounce).
- Performance budget checks (mid-tier mobile + desktop).
- Accessibility/keyboard validation.
- Final polish + docs update.

Deliverable: production-ready baggage simulation.

---

## 7) Recommended Initial Constants (starting point)

```txt
beltV = 78 px/s
beltFriction = 8.0
spawnGapMean = 86 px
spawnGapJitter = ±26 px
spawnCooldown = 220 ms
gapMin = 10 px
collisionRestitution = 0.08
collisionDamping = 0.78
dropStartY = -34 px
gravity = 1800 px/s^2
landingBounce = 0.18
maxBagsVisible = 14
```

These are seed values, expected to be tuned in Phases 3–5.

---

## 8) Risks + Mitigations

- **Risk:** too much motion noise hurts legibility.  
  **Mitigation:** clamp rotation/vertical offsets; cap impulses.

- **Risk:** perf regressions on low-power devices.  
  **Mitigation:** pooled DOM nodes, transform-only rendering, viewport pause.

- **Risk:** interaction conflicts with link clicks.  
  **Mitigation:** only apply strong impulses on intentional drag threshold, not simple click.

- **Risk:** reduced-motion inconsistency.  
  **Mitigation:** one explicit non-sim path; no hidden background loop.

---

## 9) Summary

Current marquee is visually polished but fundamentally CSS-looped and non-physical.  
The proposed plan replaces track translation with a lightweight per-bag simulation: cadence-based chute spawning, belt-driven velocity, local micro-collisions, push-through interaction, and pooled recycling for a seamless non-janky infinite loop.
