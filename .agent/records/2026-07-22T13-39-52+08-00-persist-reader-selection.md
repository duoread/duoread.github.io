# Session Record: Persist Reader Selection

- Time: 2026-07-22T13:39:52+08:00 Asia/Shanghai
- Window: exclusive after `.agent/records/2026-07-22T13-32-45+08-00-paragraph-anchor-language-toggle.md` to inclusive 2026-07-22T13:39:52+08:00 Asia/Shanghai
- Previous Record: `.agent/records/2026-07-22T13-32-45+08-00-paragraph-anchor-language-toggle.md`
- Commit: pending commit
- Branch: `master`
- Task: Remove the duplicate top publication label and persist the currently selected magazine and article.
- Source Sessions: Harness: Codex. Harness Evidence: runtime/developer context identifies Codex and Codex tools. Session Sources Checked: current conversation, project entry docs, project memory, previous `.agent/records`, git status/diff, local test output, Chrome DevTools interaction output. Session Sources Used: current conversation, `README.md`, `AGENTS.md`, `project-memory/index.md`, `project-memory/status/current-status.md`, `project-memory/project/content-pipeline.md`, local tests, local browser verification. Unavailable Sources: no additional bounded transcript files were read because project-local records and current conversation covered the commit window.

## Outcome

- Removed the duplicate top publication pill from the sidebar header; the Magazine selector remains the single publication/issue control.
- Added `duoread_selection` cookie persistence for the current issue and article.
- Restoring from cookie validates the saved issue and article against currently readable articles before applying it.
- Magazine switching now selects the next issue's first readable article, matching the rendered article list.
- Updated README, project memory, and rendered HTML assertions.

## Files And Context Read

- `README.md`
- `AGENTS.md`
- `project-memory/index.md`
- `project-memory/status/current-status.md`
- `project-memory/project/content-pipeline.md`
- `/Users/haha/.codex/skills/project-workflow/SKILL.md`
- `/Users/haha/.codex/skills/project-workflow/references/development-loop.md`
- `/Users/haha/.codex/skills/project-workflow/references/session-record.md`
- `/Users/haha/.codex/skills/project-workflow/references/harness-detection.md`
- `/Users/haha/.codex/skills/project-workflow/references/memory-policy.md`
- `app/ReaderApp.tsx`
- `app/globals.css`
- `tests/rendered-html.test.mjs`

## Engineering Facts Learned

- The top publication pill duplicated the Magazine selector and did not carry unique state or behavior.
- Chrome DevTools verification against `http://localhost:3000/` showed article selection writes `duoread_selection` and a refresh restores the selected article.

## Mistakes And Corrections

- An initial DevTools check targeted a stale localhost page context and did not show client scripts; selecting the intended isolated test page showed the hydrated client state and enabled verification.

## Project Memory Candidates

- The public reader should persist the current issue/article in `duoread_selection` and avoid duplicate publication labels outside the Magazine selector.

## Open Questions And Risks

- Only issue and article are persisted for now; reading mode and language phase remain session-local defaults.
