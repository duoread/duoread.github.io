# Session Record: Paragraph Anchor Language Toggle

- Time: 2026-07-22T13:32:45+08:00 Asia/Shanghai
- Window: exclusive after `.agent/records/2026-07-22T13-07-54+08-00-duoread-branding.md` to inclusive 2026-07-22T13:32:45+08:00 Asia/Shanghai
- Previous Record: `.agent/records/2026-07-22T13-07-54+08-00-duoread-branding.md`
- Commit: pending commit
- Branch: `master`
- Task: Keep the clicked paragraph at the same viewport position after tapping to switch language display.
- Source Sessions: Harness: Codex. Harness Evidence: runtime/developer context identifies Codex and Codex tools. Session Sources Checked: current conversation, project entry docs, project memory, previous `.agent/records`, git status/diff, local test output, Chrome DevTools interaction output. Session Sources Used: current conversation, `README.md`, `AGENTS.md`, `project-memory/index.md`, `project-memory/status/current-status.md`, `project-memory/project/content-pipeline.md`, local tests, local browser verification. Unavailable Sources: no additional bounded transcript files were read because project-local records and current conversation covered the commit window.

## Outcome

- Added paragraph-level scroll anchoring for article-body language toggles.
- Each rendered paragraph now has a stable `data-paragraph-index`.
- On a valid tap, the reader records the clicked paragraph and its viewport top, switches language display, then restores scroll so the same paragraph remains at the same viewport position.
- The existing drag threshold remains in place, so scroll/drag movement still does not toggle language.
- Updated README and project memory to document the anchored tap behavior.

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

- The page uses document scrolling rather than a separate scroll container for article text, so `window.scrollBy()` is the correct scroll restoration mechanism.
- Chrome DevTools verification against `http://localhost:3000/` showed interleaved mode kept paragraph index `7` within about `0.2px` of its original viewport top after switching language, and a simulated drag did not toggle language.
- Chrome DevTools verification in single-language mode showed paragraph index `10` stayed within about `0.2px` after switching from Chinese to English.

## Mistakes And Corrections

- Initial browser navigation to `http://127.0.0.1:3000/` failed because the dev server was listening on `localhost/[::1]`; verification continued successfully at `http://localhost:3000/`.

## Project Memory Candidates

- Language toggles should be paragraph-anchored: the tapped paragraph, not the article scroll offset, defines the stable viewport position.

## Open Questions And Risks

- None.
