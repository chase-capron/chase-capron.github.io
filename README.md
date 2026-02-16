# chase-capron.github.io

Developer-focused website for **Chase Capron** with an Apple-inspired scroll experience, project journal, and interactive motion behavior.

## What this repository contains
- `index.html` for site structure and content sections
- `styles.css` for the full visual system, layout tokens, and animations
- `themes/` for modular theme layers (`themes/presets/`) plus `themes.json` registry for future on-the-fly theme additions
- `theme-init.js` for pre-CSS theme bootstrapping (no inline scripts required)
- `app.js` for reveal-on-scroll, theme persistence, theme preset panel controls, and freshness dates (page-level + per-project cards + manifest refresh stamp)
- `projects/` for deeper project write-ups plus `projects/projects.json` freshness metadata used by homepage cards
- `assets/` for site graphics

## Design direction
- Clean, typographic-heavy interface with large section pacing
- Soft layered gradients, glass cards, and motion reveal blocks
- Reduced motion support with a local user toggle

## Project areas highlighted
- MIDI Home Control
- Home Assistant
- AI Nutritionist and Meal Planner
- GreenThumb plant automation
- Smart heating control logic
- XR and hardware-adjacent experiments

## Security and hygiene notes
- Site pages include strict `Content-Security-Policy` (including `script-src 'self'` with no inline scripts), `Permissions-Policy`, and referrer policy metadata.
- External links are opened with `rel="noopener noreferrer"`.
- Footer "Updated" dates are rendered from each page file's `document.lastModified` value for quick freshness checks.
- Project cards hydrate freshness from local `projects/projects.json` (strict path/date validation) with safe fallback to same-origin `Last-Modified` headers.
- Theme manifest (`themes/themes.json`) now supports lightweight `tags` metadata for future theme switcher UX without changing page structure.
- Run `node scripts/site-hygiene-check.mjs` before pushing to verify security meta tags, external link hygiene, and manifest schema sanity.
- Security disclosure + hardening checklist: `SECURITY.md` and `.well-known/security.txt`.

## Deploy
- GitHub Pages serves from `main`
- Pushes to `main` publish the site
