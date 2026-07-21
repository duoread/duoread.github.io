# Content Pipeline

## Goal

The project converts authorized magazine EPUB files into reviewable bilingual text files and a local reading site.

## Data Layout

- `data/raw/` stores original EPUB/PDF/MOBI files and is ignored by git.
- `texts/` stores cleaned text outputs and is committed.
- Each article keeps `en.md`, `zh.md`, and `bilingual.json`.
- `bilingual.json` is the source of truth for paragraph alignment.
- `texts/site-index.json` is generated for the website bundle.

## Display Model

The reader displays one language per original paragraph.

- Default mode: even-indexed paragraphs show Chinese, odd-indexed paragraphs show English.
- Inverted mode: the language choice is reversed.
- The UI labels these modes as `ABABA` and `BABAB`.

## Translation Model

`scripts/translate-issue.mjs` supports Codex CLI and OpenAI API backends.

- Codex backend uses the current Codex account by default.
- `CODEX_TRANSLATION_MODEL` can name a specific Codex model when the account supports it.
- OpenAI API backend requires `OPENAI_API_KEY` and uses `OPENAI_TRANSLATION_MODEL`.
- The requested `GPT-5.3-Codex-Spark` model was tested in this environment and returned unsupported for the current Codex ChatGPT account.
