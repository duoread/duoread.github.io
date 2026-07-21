# Session Record: Bootstrap bilingual magazine reader

- Time: 2026-07-21T14:04:00+08:00
- Window: task start in current conversation to 2026-07-21T14:04:00+08:00
- Previous Record: none
- Commit: pending commit
- Branch: master
- Task: Build a local bilingual magazine reading site that extracts an authorized Economist EPUB, stores original files outside git, commits cleaned `texts/`, and supports ABABA/BABAB paragraph-language switching.
- Source Sessions: Harness: Codex. Harness Evidence: runtime/developer context identifies Codex and Codex-specific tools are available. Session Sources Checked: current conversation, project files, git status, bounded project-local `.agent/records/` path. Session Sources Used: current conversation, command/test outputs, generated project files. Unavailable Sources: no previous project-local records existed; broader Codex session logs were not read because the project started as an empty new repository and current conversation supplied the relevant window.

## Outcome

Initialized the project as a git repository and built the first vertical slice:

- Added EPUB extraction from `data/raw/` to committed `texts/`.
- Extracted `TheEconomist.2026.07.18.epub` into 70 articles and 867 paragraph-aligned records.
- Added a resumable translation script with Codex CLI and OpenAI API backends.
- Translated one short article through the Codex backend for UI validation.
- Built a React/Vinext local reading site with article list, search, and ABABA/BABAB paragraph-language inversion.
- Added text validation and server-rendered HTML tests.
- Started the dev server at `http://localhost:3000/`.

## Files And Context Read

- Read `project-workflow` skill files: `SKILL.md`, `development-loop.md`, `session-record.md`, `memory-policy.md`, and `harness-detection.md`.
- Read `sites-building` skill instructions and used the Sites starter.
- Checked repository state and confirmed the workspace began empty and not under git.
- Inspected the GitHub source page and current Economist issue directory before downloading the EPUB.
- Inspected the EPUB `nav.xhtml`, `content.opf`, and representative article HTML files.
- Ran `npm test`, which completed `validate:texts`, site build, and rendered HTML tests successfully.
- Checked `http://localhost:3000/` by HTTP request after starting the local dev server.

## Engineering Facts Learned

- The EPUB stores article bodies as HTML under `EPUB/*.html`, with article order and sections available in `EPUB/nav.xhtml`.
- The raw issue page pointed to `te_2026.07.18`, and EPUB parsing was lower cost than PDF/MOBI parsing.
- Current local Node through plain `node` was v20.20.0, but the Sites/Vinext starter needs Node 22 for `fs.promises.glob`.
- Volta can run the project with pinned Node 22.13.0 via `volta run`.
- `GPT-5.3-Codex-Spark` was rejected by the current Codex ChatGPT account as unsupported.
- Codex default model worked for a short translation but has high fixed overhead per `codex exec` call.

## Mistakes And Corrections

- Initial `vinext dev` failed on Node 20 because `node:fs/promises` did not export `glob`; corrected by pinning Node 22.13.0 through Volta and using `volta run`.
- The first translation script run failed because `article.path` was not present in per-article JSON; corrected by carrying the path from `issue.json`.
- The timestamp helper initially combined UTC time with a local offset; corrected to format local runtime components with explicit UTC offset.
- The translation merge briefly wrote an internal `path` field into article JSON; corrected by omitting it before writing `bilingual.json`.

## Project Memory Candidates

- Preserve original EPUB/PDF/MOBI files under ignored `data/raw/`.
- Keep cleaned `texts/` in git for review and future validation.
- Treat `bilingual.json` as the paragraph-alignment source of truth.
- Full-issue translation should use API-backed batching or a supported lower-overhead Codex model; per-article `codex exec` is viable for spot checks but inefficient for the whole issue.
- As the corpus grows, replace the current all-content client bundle with per-article loading.

## Open Questions And Risks

- Full 70-article translation is not complete because the requested model is unsupported in the current account and no `OPENAI_API_KEY` is present in the environment.
- Only one article currently has Chinese content; the other 69 are pending and display a pending placeholder in Chinese slots.
- The local dev server is running as a background process for user inspection.
