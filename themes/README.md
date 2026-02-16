# Theme architecture

Theme definitions are data-driven via `themes/themes.json`.

## Add a new theme
1. Create `themes/<theme-id>.css`
2. Add an entry in `themes/themes.json`:
   - `id`: lowercase slug (`[a-z0-9-]`)
   - `label`: UI label
   - `css`: stylesheet path
   - `description`: short helper text shown in the header picker
3. Keep `default` as a stable fallback.

The site loads theme CSS on demand in `app.js`, so new themes can be shipped without touching `index.html`.
