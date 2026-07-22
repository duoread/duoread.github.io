# Session Record: Reposition Language Toggle

- Time: 2026-07-22T13:53:01+08:00 Asia/Shanghai
- Window: exclusive after `.agent/records/2026-07-22T13-47-26+08-00-split-magazine-issue-controls.md` to inclusive 2026-07-22T13:53:01+08:00 Asia/Shanghai
- Previous Record: `.agent/records/2026-07-22T13-47-26+08-00-split-magazine-issue-controls.md`
- Commit: pending commit
- Branch: `master`
- Task: Move the language-mode button to a better desktop position and add a short hint beside it.
- Source Sessions: Harness: Codex. Harness Evidence: runtime/developer context identifies Codex and Codex tools. Session Sources Checked: current conversation, project entry docs, project memory, previous `.agent/records`, git status/diff, local test output, Chrome DevTools layout output. Session Sources Used: current conversation, `README.md`, `AGENTS.md`, `project-memory/index.md`, `project-memory/status/current-status.md`, `project-memory/project/content-pipeline.md`, local tests, local browser verification. Unavailable Sources: no additional bounded transcript files were read because project-local records and current conversation covered the commit window.

## Outcome

- Moved the language-mode control into a bottom control row inside the article header, just above the header/body divider.
- Added the hint `点击正文以切换语言` beside the language-mode button.
- Updated CSS so the control row right-aligns on desktop and naturally left-aligns/wraps on smaller screens.
- Updated rendered HTML tests and project memory.

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

- Chrome DevTools verification against `http://localhost:3000/` showed the control row below the title and above the divider, with the button about `25px` above the divider and the hint on the same line.

## Mistakes And Corrections

- None.

## Project Memory Candidates

- The article header language control belongs in the bottom control row above the article/body divider, with a short body-tap hint beside it.

## Open Questions And Risks

- None.
