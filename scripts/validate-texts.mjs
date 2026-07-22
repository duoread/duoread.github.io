import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.argv[2] ?? "texts";
const issueRoots = await findIssueRoots(root);

let translated = 0;
let pending = 0;
let paragraphCount = 0;
let articleCount = 0;
const issueSummaries = [];

for (const issueRoot of issueRoots) {
  const issue = JSON.parse(await readFile(path.join(issueRoot, "issue.json"), "utf8"));
  let issueTranslated = 0;
  let issuePending = 0;
  let issueParagraphs = 0;

  for (const article of issue.articles) {
    const jsonPath = path.join(issueRoot, article.path);
    const articleDir = path.dirname(jsonPath);
    await access(path.join(articleDir, "en.md"));
    await access(path.join(articleDir, "zh.md"));

    const data = JSON.parse(await readFile(jsonPath, "utf8"));
    if (!data.published_at?.trim()) {
      throw new Error(`Missing published_at in ${article.id}`);
    }
    if (!["article", "issue"].includes(data.published_date_source)) {
      throw new Error(`Bad published_date_source in ${article.id}`);
    }
    if (!Array.isArray(data.paragraphs) || data.paragraphs.length < 1) {
      throw new Error(`No paragraphs: ${article.id}`);
    }

    data.paragraphs.forEach((paragraph, index) => {
      const expected = `p${String(index + 1).padStart(3, "0")}`;
      if (paragraph.id !== expected) {
        throw new Error(`Bad paragraph id in ${article.id}: expected ${expected}, got ${paragraph.id}`);
      }
      if (!paragraph.en?.trim()) throw new Error(`Empty English paragraph in ${article.id} ${expected}`);
      if (data.translation_status === "translated" && !paragraph.zh?.trim()) {
        throw new Error(`Empty Chinese paragraph in ${article.id} ${expected}`);
      }
    });

    articleCount += 1;
    paragraphCount += data.paragraphs.length;
    issueParagraphs += data.paragraphs.length;
    if (data.translation_status === "translated") {
      translated += 1;
      issueTranslated += 1;
    } else {
      pending += 1;
      issuePending += 1;
    }
  }

  issueSummaries.push({
    publication: issue.publication,
    issue: issue.issue,
    articles: issue.articles.length,
    translated: issueTranslated,
    pending: issuePending,
    paragraphs: issueParagraphs,
  });
}

if (issueRoots.length === 0) {
  throw new Error(`No issue.json files found under ${root}`);
}

console.log(
  JSON.stringify(
    {
      issues: issueRoots.length,
      articles: articleCount,
      translated,
      pending,
      paragraphs: paragraphCount,
      issue_summaries: issueSummaries,
    },
    null,
    2,
  ),
);

async function findIssueRoots(rootPath) {
  if (path.basename(rootPath) !== "texts") {
    return [rootPath];
  }

  const result = [];
  const publications = await safeReaddir(rootPath);
  for (const publication of publications) {
    if (!publication.isDirectory()) continue;
    const issues = await safeReaddir(path.join(rootPath, publication.name));
    for (const issue of issues) {
      if (!issue.isDirectory()) continue;
      result.push(path.join(rootPath, publication.name, issue.name));
    }
  }
  return result.sort();
}

async function safeReaddir(directory) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
