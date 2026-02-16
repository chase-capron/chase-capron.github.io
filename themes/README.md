# Theme architecture

Theme definitions are data-driven via `themes/themes.json`.

## Folder layout
- `themes/presets/*.css` → source theme definitions (preferred location)
- `themes/*.css` → compatibility wrappers for legacy paths
- `themes/themes.json` → manifest used by `app.js`

## Add a new theme
1. Create `themes/presets/<theme-id>.css`
2. Add an entry in `themes/themes.json`:
   - `id`: lowercase slug (`[a-z0-9-]`)
   - `label`: UI label
   - `css`: stylesheet path (must be a local `themes/.../*.css` file; remote URLs are rejected)
   - `description`: helper text shown in the picker + theme panel
   - `accent` (optional): hex color (`#RRGGBB`) for picker swatch previews
   - `tags` (optional): up to 3 short labels (max 24 chars each) for UI badges (ex: `"Baseline"`, `"Experimental"`)
3. Optional: set `defaultTheme` in `themes/themes.json` to pick the fallback when a saved theme is missing.
4. Keep `default` present unless intentionally migrating all users.

The site loads theme CSS on demand in `app.js`, so new themes can be shipped without touching `index.html`.
