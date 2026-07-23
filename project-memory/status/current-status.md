# Current Status

- Site scaffold is implemented with Vinext/React and runs locally at `http://localhost:3000/` when `npm run dev` is active.
- 8 issues have been extracted and translated: The Economist `2026-07-18` and `2026-07-11`, The New Yorker `2026-07-20` and `2026-07-13`, The Atlantic `2026-06-02` and `2026-05-02`, and Wired `2026-06-02` and `2026-05-02`.
- The current corpus has 324 translated articles and 10,356 aligned paragraphs, with zero pending articles. The website currently exposes 322 article entries because 2 pure cartoon pages are filtered from the site index while retained in `texts/` for auditability.
- `scripts/sync-latest-magazines.mjs` can check the upstream GitHub source for the latest downloadable issue of The Economist, The New Yorker, The Atlantic, and Wired; prioritize the latest issue tier; and when that tier is complete, backfill older tiers up to `MAGAZINE_BACKFILL_DEPTH` before running download, extraction, Codex Spark translation, validation, static export, source commit, and Pages publish.
- `scripts/run-daily-magazines.sh` is the cron wrapper for the remote machine. It logs under `/root/aicode/runs/multi_language/logs/`, uses a lock file, pulls the source branch when clean, supports `GIT_REMOTE` for remote-name differences, runs Codex Spark with `TRANSLATION_CHUNK_SIZE=4`, enables one-issue backfill by default, and uses `MAGAZINE_INSTALL_DEPS=auto` so dependency installation runs only when `node_modules` is missing or `package-lock.json` changed.
- The reader currently passes only translated articles to the frontend, so the preview does not show untranslated placeholders.
- The reader supports a default interleaved Chinese/English paragraph mode and a single-language mode. Tapping the article text toggles the current language display in either mode, keeps the tapped paragraph anchored at the same viewport position after the text height changes, and ignores scroll/drag movement. The language-mode button sits in a control row just above the article/body divider with a short tap hint beside it.
- The reader no longer shows the search box, article-count statistics, a duplicate top publication pill, or per-article date labels in the header. Magazine and issue selection are separate controls, while the selected issue indicates the issue publication date.
- The reader stores the current issue and article selection in a `duoread_selection` cookie and restores it on the next visit when the saved entries are still available.
- Mobile hides the long article list and uses an article selector so every article remains reachable on small screens.
- `npm run export:pages` rebuilds the lightweight site index plus per-article static JSON files under ignored `public/content/`, builds the site, and writes a static GitHub Pages entrypoint at `dist/client/index.html`.
- `npm test` validates text structure, builds the site, and checks server-rendered HTML.

## Open Risks

- Future issue translation should use the verified Codex Spark slug `gpt-5.3-codex-spark` or an `OPENAI_API_KEY` for the API backend.
- The display-name form `GPT-5.3-Codex-Spark` was rejected by `codex exec`, but `gpt-5.3-codex-spark` passed a minimal probe.
- Generated `texts/site-index.json` is now a lightweight issue/article metadata index. Article paragraphs are emitted as per-article JSON under ignored `public/content/` and loaded by the reader on demand.
- As of 2026-07-22T12:11:48+08:00, The Atlantic and Wired `2026.07.02` README EPUB links return 404, so automation selects their latest downloadable `2026.06.02` issues.
- On 2026-07-22T15:41:10+08:00, SSH to `8.219.229.52` recovered after reboot. The failed manual sync had died during `npm ci` with `SIGHUP`; previous-boot logs showed memory pressure, DNS lookup failures from SSH sessions, and OOM activity. Avoid repeated `npm ci` on the remote small-memory cron path.
