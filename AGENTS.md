# AGENTS.md

## Entry Points

- Read `README.md` for the product workflow, content layout, and commands.
- Read `project-memory/index.md` before non-trivial changes.

## Project Rules

- Keep original EPUB/PDF/MOBI files out of git; they belong under ignored `data/raw/`.
- Keep `texts/` in git because it is the reviewable, paragraph-aligned text output.
- Preserve paragraph IDs and counts across `en`, `zh`, and `bilingual.json`.
- Run `npm run validate:texts` after content-generation changes.
- Run `npm test` before handing off site or pipeline changes.
