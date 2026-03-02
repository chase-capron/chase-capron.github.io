# Arcade Phase 5 — QA/Security/Stealth Rerun (Focused)

Date: 2026-03-01 (America/New_York)
Repo: `chase-capron.github.io`
Scope: Narrow, high-signal rerun for final validation of hidden arcade behavior and nearby regressions.

## Validation checklist

- [x] Trigger isolation (Legacy card normal navigation preserved)
- [x] Stealth unlock path still works (10-tap icon unlock)
- [x] Overlay close behavior (close button + backdrop)
- [x] Escape-to-close behavior
- [~] Theme consistency between site + arcade shell (one mismatch found; see risks)
- [x] Reduced-motion handling sanity (code-level + runtime guardrails)
- [x] Regression sweep outside arcade (focused smoke)
- [x] Security/static guardrails rerun

## Commands run

1) Site hygiene baseline
- Command: `node scripts/site-hygiene-check.mjs`
- Result: ✅ Passed

2) Arcade validation pack
- Command: `node scripts/arcade-validation-pack.mjs`
- Result: ✅ Passed

3) JS syntax sweep
- Command:
  - `for f in app.js theme-init.js $(find arcade -type f -name '*.js' | sort); do node --check "$f" || exit 1; done`
- Result: ✅ Passed

4) Reduced-motion static coverage spot-check
- Command: `grep -n "prefers-reduced-motion" app.js styles.css`
- Result: ✅ Multiple guards found in both JS + CSS

## Focused manual/browser checks

Environment:
- Local server: `python3 -m http.server 4173`
- URL: `http://127.0.0.1:4173/index.html`
- Browser automation via OpenClaw browser tool

### 1) Trigger isolation / stealth behavior

- **Legacy text click** (`Legacy Device Builds` label area):
  - Expected: normal nav to `/projects/midi-home-control/`
  - Result: ✅ Passed (same-tab navigation occurs)

- **Single icon tap** (♻️ icon):
  - Expected: delayed fallback nav (not unlock)
  - Result: ✅ Passed (navigates to project page after idle timeout)

- **10 rapid icon taps**:
  - Expected: arcade opens (`#retroArcade.is-open`, `aria-hidden="false"`)
  - Result: ✅ Passed

### 2) Overlay close / escape behavior

- **Close button** (`.arcade-shell__close`):
  - Result: ✅ Shell closes, `aria-hidden="true"`, body lock removed

- **Backdrop click** (`.arcade-shell__backdrop[data-arcade-close]`):
  - Result: ✅ Shell closes, body lock removed

- **Escape key**:
  - Result: ✅ Shell closes from open state

### 3) Theme consistency

Theme sync checks while shell is open:
- **Matrix**: site theme + arcade shell tokens aligned ✅
- **Default**: site theme + arcade shell tokens aligned ✅
- **Classic Mac**: mismatch observed ⚠️
  - Site `--accent`: `#1d49c6`
  - Shell `--arcade-accent`: `#2f83ff` (default fallback)

Interpretation:
- `arcadeController.syncTheme()` appears to run before theme stylesheet variables are fully available in at least one theme transition path.
- This is a visual consistency risk, not a stealth/security break.

### 4) Reduced-motion handling

- JS guards present (`matchMedia('(prefers-reduced-motion: reduce)')`) around matrix/animated effects.
- CSS has multiple reduced-motion overrides.
- Arcade shell itself has no aggressive transition choreography to disable.
- Result: ✅ Pass (focused sanity), with recommendation to add explicit emulated-reduced-motion browser test in CI.

### 5) Regression checks outside arcade (focused)

- Legacy card primary nav path preserved ✅
- Baseline hygiene + syntax checks passed ✅
- Browser console notes observed (non-blocking for arcade scope):
  - Meta-delivered CSP warning (`frame-ancestors` ignored in meta form)
  - Project-subpage theme asset 404s when a non-default theme persisted during navigation

## Risks

1. **Theme token race/mismatch in arcade shell (Medium)**
   - Impact: visual inconsistency between site theme and arcade panel for some transitions.
   - Security impact: none observed.

2. **Console noise outside arcade (Low/Medium)**
   - Includes existing CSP/meta warning and project-subpage theme asset-path misses when theme is persisted.
   - Not directly caused by arcade trigger/overlay changes, but worth cleanup for quality.

## Final recommendation

- **Arcade stealth/security behavior is release-ready** for Phase 5 goals:
  - Trigger isolation: pass
  - Close/escape behavior: pass
  - Security/static checks: pass
  - Core regressions around Legacy card nav: pass

- **Recommended follow-up before a wider polish pass (non-blocking for hidden-feature release):**
  1) Fix arcade theme sync race (re-apply `syncTheme` after theme stylesheet load/settle).
  2) Add one automated browser test profile with emulated `prefers-reduced-motion: reduce`.
  3) Tidy non-arcade console warnings (CSP delivery mode + project page theme path handling).
