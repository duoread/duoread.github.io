# Session Record: Pages org and publication date model

Date: 2026-07-21T17:16:18+08:00 Asia/Shanghai

## Summary

- Confirmed GitHub organization `parallel-reader` exists.
- Created public repository `parallel-reader/parallel-reader.github.io`.
- Generalized the reader branding from a single Economist reader to `Parallel Reader`.
- Added GitHub Pages static export support through `npm run export:pages`.
- Added article publication date metadata:
  - `issue_published_at`
  - `article_published_at`
  - `published_at`
  - `published_date_source`
- Migrated existing Economist text JSON files to include publication date metadata.
- Preserved the current behavior of showing only translated articles in the reader.

## Verification

- `volta run npm test`
- `volta run npm run export:pages`

## Notes

- Current source has 70 extracted articles, 55 translated articles, and 15 pending articles.
- The source EPUB remains ignored under `data/raw/`.
- GitHub Actions is configured to deploy `dist/client` to Pages from the remote `main` branch.
