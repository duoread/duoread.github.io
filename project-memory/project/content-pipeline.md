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
- The UI exposes this as a `切换段落语言` button.

## Translation Model

`scripts/translate-issue.mjs` supports Codex CLI and OpenAI API backends.

- Codex backend defaults to `gpt-5.3-codex-spark`.
- `CODEX_TRANSLATION_MODEL` can name a different Codex model when needed.
- OpenAI API backend requires `OPENAI_API_KEY` and uses `OPENAI_TRANSLATION_MODEL`.
- The uppercase/display-name form `GPT-5.3-Codex-Spark` was rejected by `codex exec`.
- The actual Codex slug `gpt-5.3-codex-spark` is visible in the local model catalog and passed a minimal `codex exec` probe.
