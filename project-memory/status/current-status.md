# Current Status

- Site scaffold is implemented with Vinext/React and runs locally at `http://localhost:3000/` when `npm run dev` is active.
- `TheEconomist.2026.07.18.epub` has been extracted into 70 articles and 867 paragraphs under `texts/economist/2026-07-18/`.
- 70 articles have been translated through the Codex backend.
- No articles are currently pending translation for the 2026-07-18 Economist issue.
- `scripts/sync-latest-magazines.mjs` can check the upstream GitHub source for the latest downloadable issue of The Economist, The New Yorker, The Atlantic, and Wired; prioritize the latest issue tier; and when that tier is complete, backfill older tiers up to `MAGAZINE_BACKFILL_DEPTH` before running download, extraction, Codex Spark translation, validation, static export, source commit, and Pages publish.
- `scripts/run-daily-magazines.sh` is the cron wrapper for the remote machine. It logs under `/root/aicode/runs/multi_language/logs/`, uses a lock file, pulls the source branch when clean, supports `GIT_REMOTE` for remote-name differences, runs Codex Spark with `TRANSLATION_CHUNK_SIZE=4`, and enables one-issue backfill by default.
- The reader currently passes only translated articles to the frontend, so the preview does not show untranslated placeholders.
- The reader supports a default interleaved Chinese/English paragraph mode and a single-language mode. Tapping the article text toggles the current language display in either mode, keeps the tapped paragraph anchored at the same viewport position after the text height changes, and ignores scroll/drag movement. The language-mode button sits in a control row just above the article/body divider with a short tap hint beside it.
- The reader no longer shows the search box, article-count statistics, a duplicate top publication pill, or per-article date labels in the header. Magazine and issue selection are separate controls, while the selected issue indicates the issue publication date.
- The reader stores the current issue and article selection in a `duoread_selection` cookie and restores it on the next visit when the saved entries are still available.
- Mobile hides the long article list and uses an article selector so every article remains reachable on small screens.
- `npm run export:pages` builds the site and writes a static GitHub Pages entrypoint at `dist/client/index.html`.
- `npm test` validates text structure, builds the site, and checks server-rendered HTML.

## Open Risks

- Future issue translation should use the verified Codex Spark slug `gpt-5.3-codex-spark` or an `OPENAI_API_KEY` for the API backend.
- The display-name form `GPT-5.3-Codex-Spark` was rejected by `codex exec`, but `gpt-5.3-codex-spark` passed a minimal probe.
- Generated `texts/site-index.json` embeds all article data into the client bundle; this is acceptable for the first issue but may need per-article loading as the corpus grows.
- As of 2026-07-22T12:11:48+08:00, The Atlantic and Wired `2026.07.02` README EPUB links return 404, so automation selects their latest downloadable `2026.06.02` issues.
