# Current Status

- Site scaffold is implemented with Vinext/React and runs locally at `http://localhost:3000/` when `npm run dev` is active.
- `TheEconomist.2026.07.18.epub` has been extracted into 70 articles and 867 paragraphs under `texts/economist/2026-07-18/`.
- 55 articles have been translated through the Codex backend.
- The remaining 15 articles are pending translation.
- The reader currently passes only translated articles to the frontend, so the preview does not show untranslated placeholders.
- `npm run export:pages` builds the site and writes a static GitHub Pages entrypoint at `dist/client/index.html`.
- `npm test` validates text structure, builds the site, and checks server-rendered HTML.

## Open Risks

- Full-issue translation should continue with the verified Codex Spark slug `gpt-5.3-codex-spark` or with an `OPENAI_API_KEY` for the API backend.
- The display-name form `GPT-5.3-Codex-Spark` was rejected by `codex exec`, but `gpt-5.3-codex-spark` passed a minimal probe.
- Generated `texts/site-index.json` embeds all article data into the client bundle; this is acceptable for the first issue but may need per-article loading as the corpus grows.
