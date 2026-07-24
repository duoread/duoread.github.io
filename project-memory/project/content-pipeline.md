# Content Pipeline

## Goal

The project converts authorized magazine EPUB files into reviewable bilingual text files and a local reading site.

## Data Layout

- `data/raw/` stores original EPUB/PDF/MOBI files and is ignored by git.
- `texts/` stores cleaned text outputs and is committed.
- Each article keeps `en.md`, `zh.md`, and `bilingual.json`.
- `bilingual.json` is the source of truth for paragraph alignment.
- `texts/site-index.json` is a generated lightweight metadata index for the website bundle. It intentionally omits paragraph text.
- `public/content/` is a generated, ignored static asset directory containing one JSON file per article. It is rebuilt from `texts/` before site builds and is copied into the deployed static site.
- Pure visual-only articles, currently detected by `Cartoon:` / `漫画：` titles or generated cartoon ids, are retained under `texts/` but filtered out of `texts/site-index.json` and `public/content/`. Do not remove their source text unless the user explicitly asks for destructive cleanup.

## Display Model

The reader displays one language per original paragraph.

- Default interleaved mode: even-indexed paragraphs show Chinese, odd-indexed paragraphs show English.
- Single-language mode: every paragraph shows either Chinese or English.
- A tap inside an article paragraph toggles the current language display in either mode: interleaved mode flips the starting language, and single-language mode flips the whole article between Chinese and English. The tapped paragraph is used as the scroll anchor so it remains at the same viewport position after switching. Pointer movement greater than the tap threshold is treated as scrolling/dragging and does not toggle language.
- The header button switches between `穿插语言` and `一种语言`; it sits just above the article/body divider with the hint `点击正文以切换语言`.
- Magazine and issue are separate selectors. Selecting a magazine moves to that publication's first available issue, and selecting an issue moves to that issue's first readable article.
- Desktop navigation uses a scrollable article list. Mobile navigation hides the long list and uses an article selector.
- The current issue and article are persisted in the `duoread_selection` cookie; saved values are validated against currently available readable articles before restoration.
- The reader loads article paragraphs on demand from the article's `content_path` instead of embedding every paragraph in the homepage HTML.

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
- The wrapper uses `MAGAZINE_INSTALL_DEPS=auto` by default. It runs `npm ci --no-audit --no-fund` only when `node_modules` is absent or `package-lock.json` is newer than the installed lockfile. Use `MAGAZINE_INSTALL_DEPS=always` for a forced reinstall and `MAGAZINE_INSTALL_DEPS=never` when dependencies are known to be ready.
- Existing fully translated issues are skipped. With backfill enabled, the job works by issue tier: it finishes the latest downloadable issue for each selected publication before moving to the previous issue tier. `MAGAZINE_BACKFILL_DEPTH` controls how many older tiers are scanned; the default is `1`.
- New issues download their EPUB into ignored `data/raw/`.
- Extracted and translated text under `texts/` is committed to the `source` branch.
- The static export from `dist/client` is published to the `main` branch for `https://duoread.github.io/`.
- If the newest upstream directory has a README with a dead EPUB link, the sync scans older directories until it finds a downloadable EPUB.
- Recovery is state-based: after validation and translation audit pass, existing generated `texts/` changes should be committed and published even when the current process did not translate new articles. This matters after a previous run fails after writing translated text.
