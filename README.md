# Multi Language Reader

面向外刊精读的本地网站。它把 EPUB 杂志整理成可校验的中英文文本目录，并在网页里按自然段交替显示中文和英文。

## 内容结构

```text
data/raw/                         # 原始 EPUB/PDF/MOBI，已忽略
texts/                            # 整理后的文本，入库
  economist/
    2026-07-18/
      issue.json
      articles/
        001-politics/
          en.md
          zh.md
          bilingual.json
```

`bilingual.json` 是网站的数据源。每个自然段都有同一个 `id` 下的 `en` 和 `zh` 字段，网页只展示其中一个语言版本，并用“切换段落语言”按钮在中文开头和英文开头之间反转。

## 常用命令

```bash
npm run extract
npm run translate
npm run validate:texts
npm run dev
npm test
```

默认抽取路径是：

```text
data/raw/economist/2026-07-18/TheEconomist.2026.07.18.epub
```

也可以手动指定：

```bash
node scripts/extract-epub.mjs \
  --epub data/raw/economist/2026-07-18/TheEconomist.2026.07.18.epub \
  --issue 2026-07-18
```

## 翻译

翻译脚本支持两个后端：

```bash
TRANSLATION_PROVIDER=codex npm run translate
TRANSLATION_PROVIDER=openai OPENAI_API_KEY=... npm run translate
```

Codex 后端默认使用当前账号可调用的 Spark slug：

```bash
CODEX_TRANSLATION_MODEL=gpt-5.3-codex-spark npm run translate
```

OpenAI API 后端可以设置：

```bash
OPENAI_TRANSLATION_MODEL=gpt-5.5 npm run translate
```

脚本按文章写回 `zh.md` 和 `bilingual.json`，已完成的文章不会重复翻译。可以先试跑一篇：

```bash
npm run translate -- --limit 1
```

## 当前数据

当前已从 `TheEconomist.2026.07.18.epub` 抽取 70 篇文章和 867 个自然段。中文翻译由 `npm run translate` 填充；网站预览只展示已翻译文章。
