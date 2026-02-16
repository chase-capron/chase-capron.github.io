# Security Policy

## Scope
This repository hosts a static website deployed through GitHub Pages.

## Reporting a vulnerability
Please report security issues privately by opening a GitHub issue with `[security]` in the title:
- https://github.com/chase-capron/chase-capron.github.io/issues

If details are sensitive, provide a minimal public report and request a secure follow-up channel.

## Current hardening baseline
- `Content-Security-Policy` via `<meta http-equiv>` to restrict executable/content sources.
- `Permissions-Policy` denies camera/microphone/geolocation/topic APIs.
- `Referrer-Policy` set to `strict-origin-when-cross-origin`.
- External links use `rel="noopener"`.
- Theme loading is allowlisted through `themes/themes.json` and sanitized IDs.

## Hygiene checklist (for future updates)
- Keep third-party dependencies to zero unless required.
- Re-check CSP when adding new scripts, fonts, or remote assets.
- Ensure all new external links include `rel="noopener"`.
- Prefer progressive enhancement and fail-safe defaults.
