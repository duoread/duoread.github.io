import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function rebuildSiteIndex(textsRoot = "texts") {
  const issues = [];
  const publications = await safeReaddir(textsRoot);

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
        if (articleJson) hydratedArticles.push(articleJson);
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

  await writeJson(path.join(textsRoot, "site-index.json"), {
    publication: "multi",
    current_issue: issues[0]?.issue ?? "",
    generated_at: localTimestamp(),
    issues,
  });
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

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
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
