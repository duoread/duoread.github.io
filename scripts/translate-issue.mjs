import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import OpenAI from "openai";

const args = parseArgs(process.argv.slice(2));
const textsRoot = args.root ?? path.join("texts", "economist", "2026-07-18");
const provider = args.provider ?? process.env.TRANSLATION_PROVIDER ?? "codex";
const codexModel =
  args.model ?? process.env.CODEX_TRANSLATION_MODEL ?? "gpt-5.3-codex-spark";
const codexReasoningEffort =
  args.reasoning ?? process.env.CODEX_TRANSLATION_REASONING ?? "low";
const openaiModel =
  args.model ?? process.env.OPENAI_TRANSLATION_MODEL ?? "gpt-5.5";
const limit = args.limit ? Number(args.limit) : Number.POSITIVE_INFINITY;
const only = args.article ?? "";
const force = args.force === "true" || args.force === "1";

const issue = JSON.parse(await readFile(path.join(textsRoot, "issue.json"), "utf8"));
let translated = 0;

for (const articleRef of issue.articles) {
  if (translated >= limit) break;
  if (only && !articleRef.id.includes(only)) continue;

  const articlePath = path.join(textsRoot, articleRef.path);
  const article = {
    path: articleRef.path,
    ...(JSON.parse(await readFile(articlePath, "utf8"))),
  };
  if (!force && article.translation_status === "translated") continue;

  console.log(`Translating ${article.order}. ${article.title_en}`);
  const translatedArticle =
    provider === "openai"
      ? await translateWithOpenAI(article, openaiModel)
      : await translateWithCodex(article, codexModel);

  assertAligned(article, translatedArticle);
  const { path: _articlePath, ...articleData } = article;
  const merged = {
    ...articleData,
    title_zh: translatedArticle.title_zh,
    rubric_zh: translatedArticle.rubric_zh ?? "",
    translation_status: "translated",
    translated_at: localTimestamp(),
    translation_provider: provider,
    translation_model:
      provider === "openai"
        ? openaiModel
        : `${codexModel || "codex-default"}:${codexReasoningEffort}`,
    paragraphs: article.paragraphs.map((paragraph, index) => ({
      ...paragraph,
      zh: translatedArticle.paragraphs[index].zh,
    })),
  };

  await writeJson(articlePath, merged);
  await writeFile(path.join(path.dirname(articlePath), "zh.md"), zhMarkdown(merged), "utf8");
  await rebuildIndexes(textsRoot);
  translated += 1;
}

await rebuildIndexes(textsRoot);
console.log(`Translated ${translated} article(s).`);

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const value = argv[i + 1]?.startsWith("--") ? "true" : argv[i + 1];
    parsed[key] = value ?? "true";
    if (value && value !== "true") i += 1;
  }
  return parsed;
}

async function translateWithOpenAI(article, model) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when TRANSLATION_PROVIDER=openai");
  }

  const client = new OpenAI();
  const response = await client.responses.create({
    model,
    input: promptFor(article),
  });

  return parseModelJson(response.output_text);
}

async function translateWithCodex(article, model) {
  const cacheDir = path.join(path.dirname(path.join(textsRoot, article.path)), ".translation-cache");
  await mkdir(cacheDir, { recursive: true });
  const outputPath = path.join(cacheDir, "codex-output.json");
  const args = [
    "exec",
    "-c",
    `model_reasoning_effort="${codexReasoningEffort}"`,
    "-s",
    "read-only",
    "--ephemeral",
    "-o",
    outputPath,
  ];
  if (model) args.push("-m", model);
  args.push("-");

  try {
    execFileSync("codex", args, {
      cwd: process.cwd(),
      input: promptFor(article),
      stdio: ["pipe", "ignore", "pipe"],
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 20,
    });
  } catch (error) {
    const stderr = error.stderr?.toString("utf8") ?? "";
    const tail = stderr.split("\n").slice(-40).join("\n");
    throw new Error(`Codex translation failed for ${article.id}\n${tail}`);
  }

  const output = await readFile(outputPath, "utf8");
  return parseModelJson(output);
}

function promptFor(article) {
  const payload = {
    title_en: article.title_en,
    rubric_en: article.rubric_en,
    paragraphs: article.paragraphs.map(({ id, en }) => ({ id, en })),
  };

  return `You are a careful bilingual magazine translator.

Translate the following English magazine article into natural Simplified Chinese for a Chinese reader learning English.

Rules:
- Preserve every paragraph boundary exactly.
- Do not summarize or omit details.
- Keep names, organisations, dates and numbers accurate.
- Translate idioms naturally, but keep the original meaning.
- Return only valid JSON. No Markdown, no commentary.
- The JSON shape must be:
{
  "title_zh": "...",
  "rubric_zh": "...",
  "paragraphs": [
    {"id": "p001", "zh": "..."}
  ]
}
- The paragraphs array must have exactly ${article.paragraphs.length} items and the same ids in the same order.

Article JSON:
${JSON.stringify(payload, null, 2)}
`;
}

function parseModelJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`Model did not return JSON: ${trimmed.slice(0, 200)}`);
    return JSON.parse(match[0]);
  }
}

function assertAligned(article, translatedArticle) {
  if (!translatedArticle.title_zh) throw new Error(`Missing title_zh for ${article.id}`);
  if (!Array.isArray(translatedArticle.paragraphs)) {
    throw new Error(`Missing paragraphs for ${article.id}`);
  }
  if (translatedArticle.paragraphs.length !== article.paragraphs.length) {
    throw new Error(
      `Paragraph count mismatch for ${article.id}: expected ${article.paragraphs.length}, got ${translatedArticle.paragraphs.length}`,
    );
  }
  for (let index = 0; index < article.paragraphs.length; index += 1) {
    const expected = article.paragraphs[index].id;
    const actual = translatedArticle.paragraphs[index]?.id;
    if (expected !== actual) {
      throw new Error(`Paragraph id mismatch for ${article.id}: expected ${expected}, got ${actual}`);
    }
    if (!translatedArticle.paragraphs[index].zh?.trim()) {
      throw new Error(`Empty translation for ${article.id} ${expected}`);
    }
  }
}

function zhMarkdown(article) {
  return [
    `# ${article.title_zh}`,
    "",
    `Section: ${article.section}`,
    article.date ? `Date: ${article.date}` : "",
    article.rubric_zh ? `Rubric: ${article.rubric_zh}` : "",
    "",
    ...article.paragraphs.flatMap((paragraph) => [paragraph.zh, ""]),
  ]
    .filter((line, index, lines) => line || lines[index - 1] !== "")
    .join("\n");
}

async function rebuildIndexes(root) {
  const issuePath = path.join(root, "issue.json");
  const issueData = JSON.parse(await readFile(issuePath, "utf8"));
  const hydratedArticles = [];

  for (const article of issueData.articles) {
    const articleData = JSON.parse(await readFile(path.join(root, article.path), "utf8"));
    hydratedArticles.push(articleData);
    Object.assign(article, {
      title_zh: articleData.title_zh,
      rubric_zh: articleData.rubric_zh,
      translation_status: articleData.translation_status,
    });
  }

  issueData.translated_count = hydratedArticles.filter(
    (article) => article.translation_status === "translated",
  ).length;
  issueData.updated_at = localTimestamp();
  await writeJson(issuePath, issueData);

  await writeJson(path.join("texts", "site-index.json"), {
    publication: issueData.publication,
    current_issue: issueData.issue,
    generated_at: localTimestamp(),
    issues: [{ ...issueData, articles: hydratedArticles }],
  });
}

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function localTimestamp() {
  const date = new Date();
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hh = String(Math.floor(absolute / 60)).padStart(2, "0");
  const mm = String(absolute % 60).padStart(2, "0");
  const yyyy = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${month}-${day}T${hour}:${minute}:${second}${sign}${hh}:${mm}`;
}
