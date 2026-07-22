# Current Status

- Site scaffold is implemented with Vinext/React and runs locally at `http://localhost:3000/` when `npm run dev` is active.
- `TheEconomist.2026.07.18.epub` has been extracted into 70 articles and 867 paragraphs under `texts/economist/2026-07-18/`.
- 70 articles have been translated through the Codex backend.
- No articles are currently pending translation for the 2026-07-18 Economist issue.
- `scripts/sync-latest-magazines.mjs` can check the upstream GitHub source for the latest downloadable issue of The Economist, The New Yorker, The Atlantic, and Wired; skip already completed issues; and run download, extraction, Codex Spark translation, validation, static export, source commit, and Pages publish for new issues.
- `scripts/run-daily-magazines.sh` is the cron wrapper for the remote machine. It logs under `/root/aicode/runs/multi_language/logs/`, uses a lock file, pulls the source branch when clean, supports `GIT_REMOTE` for remote-name differences, and runs Codex Spark with `TRANSLATION_CHUNK_SIZE=4`.
- The reader currently passes only translated articles to the frontend, so the preview does not show untranslated placeholders.
- `npm run export:pages` builds the site and writes a static GitHub Pages entrypoint at `dist/client/index.html`.
- `npm test` validates text structure, builds the site, and checks server-rendered HTML.

## Open Risks

- Future issue translation should use the verified Codex Spark slug `gpt-5.3-codex-spark` or an `OPENAI_API_KEY` for the API backend.
- The display-name form `GPT-5.3-Codex-Spark` was rejected by `codex exec`, but `gpt-5.3-codex-spark` passed a minimal probe.
- Generated `texts/site-index.json` embeds all article data into the client bundle; this is acceptable for the first issue but may need per-article loading as the corpus grows.
- As of 2026-07-22T12:11:48+08:00, The Atlantic and Wired `2026.07.02` README EPUB links return 404, so automation selects their latest downloadable `2026.06.02` issues.
