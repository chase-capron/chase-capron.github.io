# Arcade Asset Attribution (Phase 4 Retry)

Date: 2026-03-02 (America/New_York)

This file documents third-party 3D assets used by the hidden arcade `Dino 3D` mini-game.

## 1) Dinosaur model (player)

- **Asset:** Trex (`trex-quaternius.obj`)
- **Source pack:** Quaternius — *Animated Dinosaur Pack* (Dec 2018)
- **Source URL:** https://quaternius.com/packs/animateddinosaurs.html
- **License:** CC0 1.0 (Public Domain Dedication)
  - https://creativecommons.org/publicdomain/zero/1.0/
- **Local files:**
  - `assets/arcade/models/trex-quaternius.obj`
  - `assets/arcade/models/licenses/quaternius-animated-dinosaur-license.txt`
- **Animatable provenance:**
  - This source pack is distributed as an animated/riggable dinosaur set.
  - The arcade runtime currently uses an optimized static mesh export for speed on low-power devices.
- **Runtime optimization applied:**
  - Source mesh triangulated and decimated for browser runtime in `arcade/games/dino3d-assets.js`
  - Triangle count reduced from 1820 → 910 for stable frame pacing

## 2) Cactus model (obstacle)

- **Asset:** Cactus (`cactus-oga.obj`)
- **Source page:** OpenGameArt — *cactus* by Phani29
- **Source URL:** https://opengameart.org/content/cactus-4
- **Direct file URL:** https://opengameart.org/sites/default/files/Cactus.obj
- **License:** CC0 1.0
  - License badge on source page indicates CC0
  - https://creativecommons.org/publicdomain/zero/1.0/
- **Local files:**
  - `assets/arcade/models/cactus-oga.obj`
  - `assets/arcade/models/licenses/opengameart-cactus-license.txt`

## 3) Retry pass notes (Phase 4 re-run)

- Re-verified source/license provenance and local attribution paths.
- Kept all runtime mesh data local (no third-party runtime requests).
- Added adaptive quality rendering in `arcade/games/dino3d.js` for improved frame pacing on weaker/mobile hardware:
  - Dynamic quality tiers: `quality` → `balanced` → `performance`
  - Automatic triangle stride escalation under sustained frame pressure
  - Wireframe stroke suppression in highest perf tier
  - Cached per-triangle normals/centers to reduce per-frame CPU math

## 4) Usage notes

- Both source assets are CC0-compatible for personal and commercial use.
- Attribution is not legally required for CC0, but source provenance is retained here for transparency and future audits.
- No remote runtime fetches are used by arcade game modules; mesh data is preprocessed into local script payloads.
