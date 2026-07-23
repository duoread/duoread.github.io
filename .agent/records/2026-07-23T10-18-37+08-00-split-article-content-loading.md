# Session Record: Split Article Content Loading

- Time: 2026-07-23T10:18:37+08:00 Asia/Shanghai
- Window: exclusive after `.agent/records/2026-07-23T09-44-05+08-00-sync-recovery-publish-path.md` to inclusive 2026-07-23T10:18:37+08:00 Asia/Shanghai
- Previous Record: `.agent/records/2026-07-23T09-44-05+08-00-sync-recovery-publish-path.md`
- Commit: pending commit
- Branch: `master`
- Task: Split article paragraph content out of the homepage bundle so DuoRead does not embed every translated paragraph in the first page.
- Source Sessions: Harness: Codex. Harness Evidence: runtime/developer context identifies Codex and Codex tools. Session Sources Checked: current conversation, project entry docs, project memory, git status/diff, local test and export output. Session Sources Used: current conversation, `README.md`, `project-memory/status/current-status.md`, `project-memory/project/content-pipeline.md`, `scripts/site-index.mjs`, `app/ReaderApp.tsx`, `tests/rendered-html.test.mjs`, local build/test/static smoke output. Unavailable Sources: no additional bounded transcript files were read because current conversation and project-local records covered the work window.

## Outcome

- Changed the generated `texts/site-index.json` from a full paragraph payload into a lightweight issue/article metadata index.
- Added generated, ignored per-article static JSON files under `public/content/<publication>/<issue>/<article>.json`.
- Updated `ReaderApp` to render navigation from metadata and fetch article paragraphs from `content_path` on demand, caching loaded articles in memory.
- Added loading and failure states for article body fetches.
- Updated build scripts so `npm run build` regenerates the lightweight index and static article JSON before Vinext builds.
- Updated tests to assert that homepage HTML no longer contains paragraph bodies and that per-article JSON exists.
- Updated README and project memory with the split-loading data model and the current 8-issue corpus status.

## Files And Context Read

- `README.md`
- `project-memory/status/current-status.md`
- `project-memory/project/content-pipeline.md`
- `scripts/site-index.mjs`
- `app/page.tsx`
- `app/ReaderApp.tsx`
- `app/globals.css`
- `tests/rendered-html.test.mjs`
- `.gitignore`
- `package.json`

## Engineering Facts Learned

- Before the split, `texts/site-index.json` was approximately 9.3MB and embedded essentially all article paragraph payloads.
- After the split, `texts/site-index.json` is approximately 384KB.
- The static exported homepage `dist/client/index.html` is approximately 332KB and no longer contains known article body text.
- The generated static article content count is 324 JSON files, matching the translated article count.

## Mistakes And Corrections

- The first static smoke test used a hard-coded article URL and hit a transient local server/request issue. Verifying the generated file path and rerunning on a fresh local static server confirmed `/content/economist/2026-07-18/001-politics.json` is present and serves correctly.

## Project Memory Candidates

- `texts/` remains the reviewable source of truth. `public/content/` is a generated build artifact and should stay ignored.
- Future scale work should consider splitting the metadata index further by publication or issue if article metadata itself grows too large.

## Open Questions And Risks

- Article body content now appears after client-side fetch rather than in the server-rendered HTML. This is acceptable for the reader workflow but means no-JavaScript clients will see navigation and loading text without article paragraphs.
