# Parallel Reader

面向外刊精读的多来源双语阅读网站。它把授权 EPUB 杂志整理成可校验的中英文文本目录，并在网页里按自然段交替显示中文和英文。

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

`bilingual.json` 是网站的数据源。每个自然段都有同一个 `id` 下的 `en` 和 `zh` 字段。网页支持“穿插语言”和“一种语言”两种阅读模式；一种语言模式下，轻点正文会切换中文/英文，滑动阅读时不会切换。移动端使用文章下拉选择，桌面端使用左侧文章列表。

## 常用命令

```bash
npm run extract
npm run translate
npm run sync:economist
npm run sync:magazines
npm run audit:translations
npm run validate:texts
npm run export:pages
npm run dev
npm test
```

远程小内存机器安装依赖时建议关闭 npm audit，避免安装后漏洞元数据计算占用过高内存：

```bash
npm ci --no-audit --no-fund
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

## 自动同步最新一期

可以让远程机器每天检查源站四本杂志的最新可下载期：The Economist、The New Yorker、The Atlantic、Wired。如果最新 issue 已经完整翻译，脚本会直接跳过；如果发现新 issue，会下载 EPUB 到被忽略的 `data/raw/`，抽取到 `texts/`，用 Codex Spark 翻译，校验后导出并发布到 GitHub Pages。

```bash
npm run sync:magazines -- --publish true
```

cron 使用的 wrapper 是：

```bash
scripts/run-daily-magazines.sh
```

默认远程路径是 `/root/aicode/multi_language`，日志写入 `/root/aicode/runs/multi_language/logs/`。如果远程仓库名不是 `duoread`，用 `GIT_REMOTE` 指定。

当前源站里 The Atlantic 和 Wired 的 `2026.07.02` 目录只有 README，README 里的 EPUB raw 链接返回 404；同步脚本会跳过这种不可下载 issue，选择最近一个真实可下载的 EPUB。

## 发布

GitHub Pages 使用静态文件发布：

```bash
npm run export:pages
```

这个命令会先构建 Vinext 应用，再把首页渲染为 `dist/client/index.html`。`dist/` 是构建产物，不入库。

## 当前数据

当前已从 `TheEconomist.2026.07.18.epub` 抽取并翻译 70 篇文章和 867 个自然段。The New Yorker、The Atlantic、Wired 已纳入同一目录和同步流程；未翻译完成前不会展示到网站正文里。
