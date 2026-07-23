# Session Record: Hide Visual-Only Cartoons

- Time: 2026-07-23T10:43:51+08:00 Asia/Shanghai
- Window: exclusive after `.agent/records/2026-07-23T10-18-37+08-00-split-article-content-loading.md` to inclusive 2026-07-23T10:43:51+08:00 Asia/Shanghai
- Previous Record: `.agent/records/2026-07-23T10-18-37+08-00-split-article-content-loading.md`
- Commit: pending commit
- Branch: `master`
- Task: Remove low-value pure cartoon pages from the reader experience without deleting auditable source text.
- Source Sessions: Harness: Codex. Harness Evidence: runtime/developer context identifies Codex and Codex tools. Session Sources Checked: current conversation, project entry docs, project memory, git status/diff, generated site index, tests. Session Sources Used: current conversation, `README.md`, `scripts/site-index.mjs`, `tests/rendered-html.test.mjs`, `texts/site-index.json`, local test/export output.

## Outcome

- Added a deterministic visual-only article filter to the site index generator.
- Filtered articles whose English title starts with `Cartoon:`, Chinese title starts with `漫画：`, or article id matches the generated cartoon slug pattern.
- Rebuilt `texts/site-index.json` and generated `public/content/`, reducing website-visible article content files from 324 to 322.
- Kept the original cartoon article text files under `texts/` for auditability and future rule changes.
- Updated tests to assert that the Economist cartoon page no longer appears in rendered HTML or the site index.
- Updated README to document that pure cartoon pages are retained as text but excluded from website display.

## Verification

- `node scripts/site-index.mjs`
- `volta run --node 22.13.0 npm test`
- `volta run --node 22.13.0 npm run export:pages`
- Manual generated-data check: site index contains 0 `Cartoon:` article titles and 322 visible articles.

## Notes

- This does not remove incidental illustration or cartoon credits inside normal articles.
- The source corpus still validates as 8 issues, 324 translated articles, and 10,356 paragraphs.
