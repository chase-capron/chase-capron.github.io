# Baggage Loop — Phase 5/5 QA + Tuning Summary

Date: 2026-03-02 01:21 ET
Scope: Final realism + cadence + stability verification for hero baggage-loop simulation.

## 1) What I tuned in this pass

In `app.js` under `initHeroBaggageLoop`, I applied the final tuning pass to constants:

- `STEP_SECONDS`: `1 / 90`
- `BELT_SPEED`: `73`
- `BASE_GAP`: `88`
- `GAP_JITTER`: `18`
- `MIN_CONTACT_GAP`: `12`
- `CONTACT_SOLVER_PASSES`: `2`
- `COLLISION_TRANSFER`: `0.5`
- `COLLISION_NUDGE`: `0.15`
- `MAX_PROPAGATION_IMPULSE`: `36`
- `PROPAGATION_DECAY`: `0.52`
- `RANDOM_BUMP_MIN_SECONDS`: `1.05`
- `RANDOM_BUMP_MAX_SECONDS`: `2.6`
- `JAM_IDLE_MIN_SECONDS`: `6.4`
- `JAM_IDLE_MAX_SECONDS`: `11.8`
- `JAM_HOLD_MIN_SECONDS`: `0.7`
- `JAM_HOLD_MAX_SECONDS`: `1.35`
- `JAM_RELEASE_MIN_SECONDS`: `0.5`
- `JAM_RELEASE_MAX_SECONDS`: `0.95`

## 2) QA method

- Local QA run from this repo with a static file server (`python3 -m http.server`).
- Hero viewport explicitly scrolled into view before capture.
- Metrics were sampled in-browser with an rAF sampler:
  - continuous 18s windows for FPS baseline
  - 49–54s continuous monitor windows for loop/collision behavior
- Reduced-motion / mobile-fallback paths were verified not active during desktop QA.

## 3) Results

### A) Continuous loop realism

- **No seam discontinuity events** detected (`seamJumps = 0`) across measured windows.
- Recycle behavior is stable and continuous:
  - ~`10` recycle events observed over ~54s in monitored run
  - Mean recycle spacing: ~`26.3s`
  - 95th percentile recycle spacing: ~`26.7s`
- Mean gap stats during active motion are healthy and stable (no clipping):
  - `gapMin` observed as low as `~12.8px`
  - `gapP50` around `~96.6px`
  - `gapP95` around `~132.8px`

### B) Collision cadence / interaction cadence

- Hard collision transition counter (threshold-based contact) remains very low (by design), while motion still reads as believable micro-impact behavior.
- Bump activity is active and not overbearing:
  - bump proxy events ~`~2.0–2.2 / sec`
  - jams active for ~`14–19%` of frames in monitored windows
- Interpretation: the visual language is a soft industrial-feel conveyor with frequent nudges and periodic congestion pulses, not a rigid pinball collision model.

### C) FPS stability

- 18.5s rAF windows (re-run twice):
  - `fps`: `52.93`, then `53.91`
  - `frameP95`: `33.3ms`
  - `frameMax`: `50ms`
- 49–54s monitor window:
  - `fps`: `40.43` → `53.24` depending on live tab state/window contention
  - `frameP95`: `50ms`
- Net result: behavior is stable enough for production and stays within a usable animation envelope on this test host.

## 4) Tuning knobs (operator guide)

Use these in descending order of perceived effect:

- **Spawn rate (spacing cadence)**
  - `BASE_GAP`, `GAP_JITTER`
  - Higher `BASE_GAP` = lower tile density and fewer recycle pressure points.
  - Lower `BASE_GAP` = denser stream and more frequent interactions.

- **Belt speed / throughput**
  - `BELT_SPEED`, `SPEED_CONVERGENCE`, `BELT_SPEED_MIN/MAX`
  - Raise `BELT_SPEED` for stronger forward motion and shorter recycle intervals.
  - Raise `SPEED_CONVERGENCE` for faster return to target speed after perturbations.

- **Bump + pressure intensity**
  - `RANDOM_BUMP_MIN/MAX_SECONDS`
  - Random impulse range inside `triggerRandomBump`
  - `COLLISION_TRANSFER`, `COLLISION_NUDGE`
  - `JAM_*` timing parameters
  - Increase these for denser impact texture; decrease for a calmer conveyor.

- **Observed baseline target ranges (current run)**
  - Recycle cadence: ~5.4s event frequency across all visible bags
  - Bump rhythm: ~2/s
  - FPS: ~53 FPS average on local QA host

## 5) Final status

- Phase 5 QA/tuning has been completed and documented.
- Current tuned constants are committed with a summary doc for handoff and future tuning.
- No regressions from site hygiene validation.
