# Current Status

- Site scaffold is implemented with Vinext/React and runs locally at `http://localhost:3000/` when `npm run dev` is active.
- `TheEconomist.2026.07.18.epub` has been extracted into 70 articles and 867 paragraphs under `texts/economist/2026-07-18/`.
- 47 articles have been translated through the Codex backend.
- The remaining 23 articles are pending translation.
- The reader currently passes only translated articles to the frontend, so the preview does not show untranslated placeholders.
- `npm test` validates text structure, builds the site, and checks server-rendered HTML.

## Open Risks

- Full-issue translation needs either a supported Codex Spark model with acceptable cost/latency or an `OPENAI_API_KEY` for the API backend.
- The current Codex account did not support `GPT-5.3-Codex-Spark` when tested through `codex exec`.
- Generated `texts/site-index.json` embeds all article data into the client bundle; this is acceptable for the first issue but may need per-article loading as the corpus grows.
