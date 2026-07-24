import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export async function rebuildSiteIndex(textsRoot = "texts", options = {}) {
  const issues = [];
  const publicContentRoot = options.publicContentRoot ?? path.join("public", "content");
  const publications = await safeReaddir(textsRoot);

  await rm(publicContentRoot, { recursive: true, force: true });
  await mkdir(publicContentRoot, { recursive: true });

  for (const publicationEntry of publications) {
    if (!publicationEntry.isDirectory()) continue;
    const publicationPath = path.join(textsRoot, publicationEntry.name);
    const issueEntries = await safeReaddir(publicationPath);

    for (const issueEntry of issueEntries) {
      if (!issueEntry.isDirectory()) continue;
      const issuePath = path.join(publicationPath, issueEntry.name, "issue.json");
      const issue = await readJsonIfExists(issuePath);
      if (!issue) continue;

      const hydratedArticles = [];
      for (const article of issue.articles ?? []) {
        const articleJson = await readJsonIfExists(
          path.join(publicationPath, issueEntry.name, article.path),
        );
        if (!articleJson) continue;
        if (articleJson.translation_status !== "translated") continue;
        if (isVisualOnlyArticle(articleJson)) continue;

        const contentPath = articleContentPath(
          publicationEntry.name,
          issueEntry.name,
          articleJson.id,
        );
        const { paragraphs, ...articleMeta } = articleJson;
        hydratedArticles.push({
          ...articleMeta,
          paragraph_count: paragraphs?.length ?? article.paragraph_count ?? 0,
          content_path: contentPath,
        });
        await writeJsonIfChanged(
          path.join(publicContentRoot, publicationEntry.name, issueEntry.name, `${articleJson.id}.json`),
          articleJson,
        );
      }

      issues.push({ ...issue, articles: hydratedArticles });
    }
  }

  issues.sort((a, b) => {
    const byDate = String(b.published_at ?? b.issue).localeCompare(
      String(a.published_at ?? a.issue),
    );
    if (byDate !== 0) return byDate;
    return String(a.publication).localeCompare(String(b.publication));
  });

  const indexPath = path.join(textsRoot, "site-index.json");
  const previousIndex = await readJsonIfExists(indexPath);
  const nextIndex = {
    publication: "multi",
    current_issue: issues[0]?.issue ?? "",
    generated_at: previousIndex?.generated_at ?? localTimestamp(),
    issues,
  };

  if (!sameIndexContent(previousIndex, nextIndex)) {
    nextIndex.generated_at = localTimestamp();
  }

  await writeJsonIfChanged(indexPath, nextIndex);
}

async function safeReaddir(directory) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeJsonIfChanged(filePath, data) {
  const next = `${JSON.stringify(data, null, 2)}\n`;
  try {
    const current = await readFile(filePath, "utf8");
    if (current === next) return;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, next, "utf8");
}

function sameIndexContent(previous, next) {
  if (!previous) return false;
  return JSON.stringify({ ...previous, generated_at: "" }) === JSON.stringify({ ...next, generated_at: "" });
}

function articleContentPath(publication, issue, articleId) {
  return `/content/${publication}/${issue}/${articleId}.json`;
}

export function isVisualOnlyArticle(article) {
  const id = String(article.id ?? "");
  const titleEn = String(article.title_en ?? "");
  const titleZh = String(article.title_zh ?? "");
  return /^cartoon\b\s*:/i.test(titleEn) || /^漫画\s*[:：]/.test(titleZh) || /^\d+-cartoon-/.test(id);
}

export function localTimestamp() {
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await rebuildSiteIndex(process.argv[2] ?? "texts");
}
