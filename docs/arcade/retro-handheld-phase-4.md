# Retro Handheld Phase 4/5 — Dino 3D Desert Runner + Asset Licensing

Date: 2026-03-02 (America/New_York)  
Repo: `chase-capron.github.io`

## Goal completed

Integrated a new hidden-arcade cartridge, **Dino 3D**, using free-to-use external 3D assets (CC0), with local preprocessed mesh payloads for web performance and documented attribution.

## What changed

### 1) New Dino 3D arcade cartridge

- Added tab + panel in `index.html`:
  - `data-arcade-tab="dino3d"`
  - `data-arcade-pane="dino3d"`
- Added HUD nodes:
  - `#dino3dScore`
  - `#dino3dBest`
  - `#dino3dStatus`
- Added touch control hook:
  - `data-dino3d-control="jump"`

### 2) New game modules

- `arcade/games/dino3d-assets.js`
  - Contains preprocessed local mesh payloads for dinosaur + cactus.
- `arcade/games/dino3d.js`
  - Canvas-based lightweight 3D renderer and runner gameplay loop.
  - Jump controls: `Space`, `↑`, `W`, or on-screen/touch jump button.
  - Auto-run difficulty ramp + score + local best score persistence.

### 3) Performance-focused implementation

- Local preprocessed mesh payloads (no network fetch at runtime).
- Trex mesh decimation from source triangulation (1820 → 910 tris).
- Frame-step cap (`dt` clamp) to avoid simulation spikes.
- Object pool for obstacles (no per-frame obstacle allocations).
- Visibility pause support to avoid hidden-tab render churn.

### 4) Asset attribution and licensing

- Added `docs/arcade/asset-attribution.md` with source + license details.
- Both imported asset sources are CC0-compatible.
- Local license artifact added for Quaternius source pack.

### 5) Validation updates

Updated `scripts/arcade-validation-pack.mjs` to cover:

- new Dino 3D script includes
- new tab/pane/canvas/control hooks
- presence of asset attribution document markers

## Verification

```bash
node scripts/arcade-validation-pack.mjs
```
