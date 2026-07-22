# Session Record: Migrate Pages to DuoRead

Date: 2026-07-22T10:40:13+08:00 Asia/Shanghai

## Summary

- Created public repository `duoread/duoread.github.io`.
- Updated static export target from `parallel-reader.github.io` to `duoread.github.io`.
- Pushed full source to `duoread/duoread.github.io` branch `source`.
- Pushed generated static GitHub Pages files to branch `main`.
- Enabled GitHub Pages from `main` `/`.

## Verification

- `volta run npm test`
- `volta run npm run export:pages`
- `curl https://duoread.github.io/` confirmed the reader HTML renders with 70 translated articles.
- Chrome check confirmed 70 articles, 70 translated, no pending placeholder, and the language toggle changes the first paragraph to English.
