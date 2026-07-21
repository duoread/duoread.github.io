# Session Record: Show translated articles only

- Time: 2026-07-21T16:54:00+08:00
- Window: 2026-07-21T14:04:00+08:00 to 2026-07-21T16:54:00+08:00
- Previous Record: `.agent/records/2026-07-21T14-04-00+08-00-bootstrap-bilingual-reader.md`
- Commit: pending commit
- Branch: master
- Task: Stop full-issue translation after user interruption and show only translated articles in the local preview.
- Source Sessions: Harness: Codex. Harness Evidence: runtime/developer context identifies Codex and current project records exist. Session Sources Checked: current conversation, project-local `.agent/records/`, git status, command outputs. Session Sources Used: current conversation, previous session record, text validation output, test output. Unavailable Sources: broader Codex session logs not read; current bounded project window was available from the live conversation and project-local records.

## Outcome

- Stopped continuing translation after user interruption.
- Confirmed no `codex exec` or `translate-issue` processes remained running.
- Translation progress reached 47 translated articles and 23 pending articles.
- Updated the reader to show only translated articles.
- Filtered `site-index` data in `app/page.tsx` before passing content to the client so pending article data is not part of the preview payload.
- Kept stats showing 70 total articles and 47 translated articles.
- Verified `npm test` passes.
- Verified local server at `http://localhost:3000/` renders translated article titles and does not render the pending placeholder.

## Files And Context Read

- `.agent/records/2026-07-21T14-04-00+08-00-bootstrap-bilingual-reader.md`
- `app/ReaderApp.tsx`
- `app/page.tsx`
- `scripts/translate-issue.mjs`
- `texts/economist/2026-07-18/issue.json`
- `texts/site-index.json`
- `project-memory/status/current-status.md`

## Engineering Facts Learned

- Codex default model at low reasoning effort translated through article 47 before the user stopped the long-running batch.
- `npm run validate:texts` reports 70 articles, 47 translated, 23 pending, and 867 paragraphs.
- Passing all `site-index` data into the client caused pending article JSON to appear in the page payload even when the UI list was filtered; server-side filtering in `app/page.tsx` avoids that for the preview.

## Mistakes And Corrections

- Continuing the full-issue Codex batch was too slow for the user's immediate need. The process was stopped and the UI now focuses on already translated content.
- The first UI-only filter still left pending article data in the rendered payload; corrected by filtering before passing content into the client component.

## Project Memory Candidates

- Keep preview mode focused on translated articles until a full translation run completes.
- Continue discussing the required Codex Spark entitlement or exact model identifier before resuming remaining translations.

## Open Questions And Risks

- The user expects `codex-spark`; current environment previously rejected `GPT-5.3-Codex-Spark` for this Codex ChatGPT account.
- Need decide whether the missing piece is account/model entitlement, exact model slug, or an API credential that has access to the intended Spark model.
