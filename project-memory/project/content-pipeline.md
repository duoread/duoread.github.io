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

- Default interleaved mode: even-indexed paragraphs show Chinese, odd-indexed paragraphs show English.
- Single-language mode: every paragraph shows either Chinese or English.
- In single-language mode, a tap inside the article paragraph area toggles Chinese/English. Pointer movement greater than the tap threshold is treated as scrolling/dragging and does not toggle language.
- The header button switches between `穿插语言` and `一种语言`.
- Desktop navigation uses a scrollable article list. Mobile navigation hides the long list and uses an article selector.

## Publication Dates

Magazine articles use the article-level publication date when the source EPUB exposes one. If an article does not expose a more precise date, it inherits the magazine issue publication date.

## Translation Model

`scripts/translate-issue.mjs` supports Codex CLI and OpenAI API backends.

- Codex backend defaults to `gpt-5.3-codex-spark`.
- `CODEX_TRANSLATION_MODEL` can name a different Codex model when needed.
- OpenAI API backend requires `OPENAI_API_KEY` and uses `OPENAI_TRANSLATION_MODEL`.
- The uppercase/display-name form `GPT-5.3-Codex-Spark` was rejected by `codex exec`.
- The actual Codex slug `gpt-5.3-codex-spark` is visible in the local model catalog and passed a minimal `codex exec` probe.

## Scheduled Sync

The remote daily job uses `scripts/run-daily-magazines.sh`, which calls `scripts/sync-latest-magazines.mjs --publish true`.

- The latest downloadable issue is discovered from the upstream GitHub directories for The Economist, The New Yorker, The Atlantic, and Wired.
- Existing fully translated issues are skipped.
- New issues download their EPUB into ignored `data/raw/`.
- Extracted and translated text under `texts/` is committed to the `source` branch.
- The static export from `dist/client` is published to the `main` branch for `https://duoread.github.io/`.
- If the newest upstream directory has a README with a dead EPUB link, the sync scans older directories until it finds a downloadable EPUB.
