# Session Record: Mobile Article Navigation

- Time: 2026-07-22T13:00:29+08:00 Asia/Shanghai
- Window: exclusive after `.agent/records/2026-07-22T12-54-47+08-00-reader-mode-toggle.md` to inclusive 2026-07-22T13:00:29+08:00 Asia/Shanghai
- Previous Record: `.agent/records/2026-07-22T12-54-47+08-00-reader-mode-toggle.md`
- Commit: pending commit
- Branch: `master`
- Task: Remove search and article-count UI, and improve mobile navigation so more than one article is reachable.
- Source Sessions: Harness: Codex. Harness Evidence: runtime/developer context identifies Codex and Codex tools. Session Sources Checked: current conversation, project entry docs, project memory, previous `.agent/records`, git status/diff, local test output, local SSR output. Session Sources Used: current conversation, `README.md`, `AGENTS.md`, `project-memory/index.md`, `project-memory/status/current-status.md`, `project-memory/project/content-pipeline.md`, local tests, local SSR checks. Unavailable Sources: no additional bounded transcript files were read because project-local records and current conversation covered the commit window.

## Outcome

- Removed the visible search field from the reader sidebar.
- Removed the article-count and translated-count stats blocks.
- Added an article selector for mobile navigation.
- Kept the desktop scrollable article list.
- On mobile, the long article list is hidden and the article selector remains visible, so users can jump to any article without relying on the constrained sidebar list.
- Updated README and project memory to document the desktop/mobile navigation model.

## Files And Context Read

- `README.md`
- `AGENTS.md`
- `project-memory/index.md`
- `project-memory/status/current-status.md`
- `project-memory/project/content-pipeline.md`
- `app/ReaderApp.tsx`
- `app/globals.css`
- `tests/rendered-html.test.mjs`

## Engineering Facts Learned

- SSR output after the change contains the article selector and 70 article-related options for the translated Economist issue, and no longer contains visible `Search`, `Articles`, or `Translated` statistic labels.
- Mobile CSS now shows `.article-picker` and hides `.article-list` under `max-width: 860px`.

## Mistakes And Corrections

- The first article option counter used a regex that did not handle React SSR comment separators. The check was corrected to count option tags and verify known article titles.

## Project Memory Candidates

- Mobile article navigation should use the selector rather than trying to fit the desktop article list into the top panel.

## Open Questions And Risks

- The mobile selector contains long article titles. Native select controls truncate visually according to platform behavior, which is acceptable for this slice.
