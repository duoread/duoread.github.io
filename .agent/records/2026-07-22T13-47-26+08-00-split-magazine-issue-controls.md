# Session Record: Split Magazine Issue Controls

- Time: 2026-07-22T13:47:26+08:00 Asia/Shanghai
- Window: exclusive after `.agent/records/2026-07-22T13-39-52+08-00-persist-reader-selection.md` to inclusive 2026-07-22T13:47:26+08:00 Asia/Shanghai
- Previous Record: `.agent/records/2026-07-22T13-39-52+08-00-persist-reader-selection.md`
- Commit: pending commit
- Branch: `master`
- Task: Split magazine and issue selection into separate controls and remove the article-date label from the article header.
- Source Sessions: Harness: Codex. Harness Evidence: runtime/developer context identifies Codex and Codex tools. Session Sources Checked: current conversation, project entry docs, project memory, previous `.agent/records`, git status/diff, local test output, Chrome DevTools interaction output. Session Sources Used: current conversation, `README.md`, `AGENTS.md`, `project-memory/index.md`, `project-memory/status/current-status.md`, `project-memory/project/content-pipeline.md`, local tests, local browser verification. Unavailable Sources: no additional bounded transcript files were read because project-local records and current conversation covered the commit window.

## Outcome

- Replaced the combined Magazine/issue selector with separate `Magazine` and `Issue` selectors.
- Kept the two selectors on the same row in the sidebar.
- Selecting a magazine now activates that publication's first available issue and first readable article; selecting an issue activates that issue's first readable article.
- Removed the article header date label because the issue selector already shows the issue publication date.
- Kept the existing `duoread_selection` cookie format compatible because it persists the resolved issue key and article id.
- Updated rendered HTML tests, README, and project memory.

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

- The existing cookie stores the final issue key as `publication:issue`, so no cookie migration was required for split controls.
- Chrome DevTools verification against `http://localhost:3000/` showed `Magazine` and `Issue` render on the same row, the article header no longer contains `date-label`, and an old-format cookie still restores article `010-the-united-states-is-once-again-in-a-state-of-rebellion`.

## Mistakes And Corrections

- None.

## Project Memory Candidates

- The public reader separates publication selection from issue selection. The article header should not show a separate article-date label unless a future design needs article-level date specificity again.

## Open Questions And Risks

- Current data exposes only one issue for the translated Economist content, so multi-issue behavior is implemented and ready but not visually rich until more issues are translated.
