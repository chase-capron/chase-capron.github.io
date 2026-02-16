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
   - `css`: stylesheet path (use `themes/presets/<theme-id>.css`)
   - `description`: helper text shown in the picker + theme panel
3. Keep `default` as a stable fallback.

The site loads theme CSS on demand in `app.js`, so new themes can be shipped without touching `index.html`.
