# Security Policy

## Scope
This repository hosts a static website deployed through GitHub Pages.

## Reporting a vulnerability
Please report security issues privately by opening a GitHub issue with `[security]` in the title:
- https://github.com/chase-capron/chase-capron.github.io/issues

If details are sensitive, provide a minimal public report and request a secure follow-up channel.

## Current hardening baseline
- `Content-Security-Policy` via `<meta http-equiv>` to restrict executable/content sources (`script-src 'self'`; no inline script execution).
- `Permissions-Policy` denies camera/microphone/geolocation/topic APIs.
- `Referrer-Policy` set to `strict-origin-when-cross-origin`.
- External links use `rel="noopener noreferrer"`.
- Theme loading is allowlisted through `themes/themes.json` (`themes/presets/*`) and sanitized IDs.
- Project freshness metadata is loaded from same-origin `projects/projects.json` with strict path/date sanitization and no HTML injection.

## Hygiene checklist (for future updates)
- Keep third-party dependencies to zero unless required.
- Re-check CSP when adding new scripts, fonts, or remote assets.
- Keep `projects/projects.json` and `themes/themes.json` local-only, schema-valid, and free of untrusted HTML.
- Ensure all new external links include `rel="noopener noreferrer"`.
- Prefer progressive enhancement and fail-safe defaults.
