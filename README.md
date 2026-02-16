# chase-capron.github.io

Developer-focused website for **Chase Capron** with an Apple-inspired scroll experience, project journal, and interactive motion behavior.

## What this repository contains
- `index.html` for site structure and content sections
- `styles.css` for the full visual system, layout tokens, and animations
- `themes/` for modular theme layers (`default.css`, `arc.css`) to support future theme additions
- `app.js` for reveal-on-scroll, theme persistence, and freshness date rendering
- `projects/` for deeper project write-ups
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
- Site pages include a strict referrer policy and a locked-down permissions policy via `<meta>`.
- External links are opened with `rel="noopener"`.
- Footer "Updated" dates are rendered from each page file's `document.lastModified` value for quick freshness checks.

## Deploy
- GitHub Pages serves from `main`
- Pushes to `main` publish the site
