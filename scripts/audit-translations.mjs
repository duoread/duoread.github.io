import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.argv[2] ?? "texts";
const issues = await findIssueRoots(root);
const problems = [];
let translatedArticles = 0;
let translatedParagraphs = 0;

for (const issueRoot of issues) {
  const issue = JSON.parse(await readFile(path.join(issueRoot, "issue.json"), "utf8"));
  for (const ref of issue.articles) {
    const article = JSON.parse(await readFile(path.join(issueRoot, ref.path), "utf8"));
    if (article.translation_status !== "translated") continue;
    translatedArticles += 1;

    for (const paragraph of article.paragraphs) {
      translatedParagraphs += 1;
      const zh = paragraph.zh?.trim() ?? "";
      const en = paragraph.en?.trim() ?? "";
      const ratio = en.length > 0 ? zh.length / en.length : 0;
      const label = `${article.publication}/${article.issue}/${article.id}/${paragraph.id}`;

      if (!zh) problems.push(`${label}: empty zh`);
      if (/待翻译|尚未生成|translation pending|TODO/i.test(zh)) {
        problems.push(`${label}: placeholder text`);
      }
      if (en.length >= 160 && zh.length < 18) {
        problems.push(`${label}: suspiciously short zh ${zh.length}/${en.length}`);
      }
      if (en.length >= 300 && ratio < 0.08) {
        problems.push(`${label}: suspicious zh/en ratio ${ratio.toFixed(3)}`);
      }
      if (/[，,、；;：:]$/.test(zh) && !/[,:;]$/.test(en)) {
        problems.push(`${label}: suspicious trailing punctuation`);
      }
    }
  }
}

const result = {
  issues: issues.length,
  translated_articles: translatedArticles,
  translated_paragraphs: translatedParagraphs,
  problems: problems.length,
  sample: problems.slice(0, 50),
};

console.log(JSON.stringify(result, null, 2));
if (problems.length > 0) process.exitCode = 1;

async function findIssueRoots(rootDir) {
  const result = [];
  const publications = await safeReaddir(rootDir);
  for (const publication of publications) {
    if (!publication.isDirectory()) continue;
    const issueEntries = await safeReaddir(path.join(rootDir, publication.name));
    for (const issue of issueEntries) {
      if (!issue.isDirectory()) continue;
      result.push(path.join(rootDir, publication.name, issue.name));
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
