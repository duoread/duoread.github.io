import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.argv[2] ?? path.join("texts", "economist", "2026-07-18");
const issue = JSON.parse(await readFile(path.join(root, "issue.json"), "utf8"));

let translated = 0;
let pending = 0;
let paragraphCount = 0;

for (const article of issue.articles) {
  const jsonPath = path.join(root, article.path);
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

  paragraphCount += data.paragraphs.length;
  if (data.translation_status === "translated") translated += 1;
  else pending += 1;
}

console.log(
  JSON.stringify(
    {
      issue: issue.issue,
      articles: issue.articles.length,
      translated,
      pending,
      paragraphs: paragraphCount,
    },
    null,
    2,
  ),
);
