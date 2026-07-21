import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import * as cheerio from "cheerio";
import JSZip from "jszip";
import slugify from "slugify";

const args = parseArgs(process.argv.slice(2));
const epubPath = args.epub ?? "data/raw/economist/2026-07-18/TheEconomist.2026.07.18.epub";
const issue = args.issue ?? inferIssue(epubPath);
const publication = args.publication ?? "economist";
const outputRoot = args.out ?? path.join("texts", publication, issue);

const raw = await readFile(epubPath);
const zip = await JSZip.loadAsync(raw);
const navHtml = await readZipText(zip, "EPUB/nav.xhtml");
const entries = parseNav(navHtml);

await rm(outputRoot, { recursive: true, force: true });
await mkdir(path.join(outputRoot, "articles"), { recursive: true });

const articles = [];
let order = 0;

for (const entry of entries) {
  const htmlPath = `EPUB/${entry.href}`;
  const html = await readZipText(zip, htmlPath).catch(() => null);
  if (!html) continue;

  const article = parseArticle(html, entry, htmlPath);
  if (!article || article.paragraphs.length < 2) continue;

  order += 1;
  const slug = `${String(order).padStart(3, "0")}-${toSlug(article.title_en)}`;
  const articleDir = path.join(outputRoot, "articles", slug);
  await mkdir(articleDir, { recursive: true });

  const bilingual = {
    id: slug,
    source_href: entry.href,
    publication,
    issue,
    order,
    section: article.section,
    title_en: article.title_en,
    title_zh: "",
    rubric_en: article.rubric_en,
    rubric_zh: "",
    date: article.date,
    origin_url: article.origin_url,
    translation_status: "pending",
    paragraphs: article.paragraphs.map((en, index) => ({
      id: `p${String(index + 1).padStart(3, "0")}`,
      en,
      zh: "",
    })),
  };

  await writeFile(path.join(articleDir, "en.md"), articleMarkdown(article, "en"), "utf8");
  await writeFile(path.join(articleDir, "zh.md"), pendingChineseMarkdown(article), "utf8");
  await writeJson(path.join(articleDir, "bilingual.json"), bilingual);

  articles.push({
    id: slug,
    order,
    section: article.section,
    title_en: article.title_en,
    title_zh: "",
    rubric_en: article.rubric_en,
    rubric_zh: "",
    date: article.date,
    paragraph_count: bilingual.paragraphs.length,
    translation_status: "pending",
    path: `articles/${slug}/bilingual.json`,
  });
}

const issueJson = {
  publication,
  issue,
  title: `The Economist ${issue}`,
  source_epub: epubPath,
  extracted_at: localTimestamp(),
  article_count: articles.length,
  articles,
};

await writeJson(path.join(outputRoot, "issue.json"), issueJson);
await buildSiteIndex(publication, issue, outputRoot, issueJson);

console.log(`Extracted ${articles.length} articles to ${outputRoot}`);

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

function inferIssue(filePath) {
  const match = filePath.match(/(\d{4})[.-](\d{2})[.-](\d{2})/);
  if (!match) return "unknown-issue";
  return `${match[1]}-${match[2]}-${match[3]}`;
}

async function readZipText(zip, name) {
  const file = zip.file(name);
  if (!file) throw new Error(`Missing EPUB entry: ${name}`);
  return file.async("string");
}

function parseNav(html) {
  const $ = cheerio.load(html, { xmlMode: true });
  const entries = [];

  $("nav[epub\\:type='toc'] > ol > li").each((_, sectionNode) => {
    const section = cleanText($(sectionNode).children("span").first().text());
    $(sectionNode)
      .find("ol li a")
      .each((__, link) => {
        const href = ($(link).attr("href") ?? "").split("#")[0];
        const title = cleanText($(link).text());
        if (!href || !title || !href.endsWith(".html")) return;
        entries.push({ section, href, title });
      });
  });

  return entries;
}

function parseArticle(html, entry, htmlPath) {
  const $ = cheerio.load(html);
  $("script, style, nav, img, figure, .link_navbar").remove();

  const section = cleanText($(".te_section_title").first().text()) || entry.section;
  const title_en = cleanText($(".te_article_title").first().text()) || entry.title;
  const rubric_en = cleanText($(".te_article_rubric").first().text());
  const date = cleanText($(".te_article_datePublished").first().text());
  const origin_url = $("a.origin_link").first().attr("href") ?? "";

  if (!title_en || /^(cover|contents)$/i.test(title_en)) return null;

  const paragraphs = [];
  $("body p").each((_, node) => {
    const $node = $(node);
    if ($node.hasClass("link_navbar")) return;
    if ($node.find(".te_section_title").length > 0) return;
    const text = cleanText($node.text());
    if (!text || text.length < 20) return;
    if (/^This article was downloaded by/i.test(text)) return;
    paragraphs.push(text);
  });

  return {
    section,
    title_en,
    rubric_en,
    date,
    origin_url,
    htmlPath,
    paragraphs: dedupeAdjacent(paragraphs),
  };
}

function cleanText(value) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function dedupeAdjacent(items) {
  const result = [];
  for (const item of items) {
    if (result[result.length - 1] !== item) result.push(item);
  }
  return result;
}

function toSlug(title) {
  return slugify(title, { lower: true, strict: true }).slice(0, 72) || "article";
}

function articleMarkdown(article, language) {
  const title = language === "en" ? article.title_en : article.title_zh;
  const rubric = language === "en" ? article.rubric_en : article.rubric_zh;
  const body = article.paragraphs.join("\n\n");
  return [
    `# ${title}`,
    "",
    `Section: ${article.section}`,
    article.date ? `Date: ${article.date}` : "",
    rubric ? `Rubric: ${rubric}` : "",
    "",
    body,
    "",
  ]
    .filter((line, index, lines) => line || lines[index - 1] !== "")
    .join("\n");
}

function pendingChineseMarkdown(article) {
  return [
    `# ${article.title_en}`,
    "",
    `Section: ${article.section}`,
    article.date ? `Date: ${article.date}` : "",
    "",
    "<!-- Translation pending. Run `npm run translate` to fill this file. -->",
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function buildSiteIndex(publicationName, issueName, root, issueData) {
  const hydratedArticles = [];
  for (const article of issueData.articles) {
    const articleJson = JSON.parse(
      await readFile(path.join(root, article.path), "utf8"),
    );
    hydratedArticles.push(articleJson);
  }

  await writeJson(path.join("texts", "site-index.json"), {
    publication: publicationName,
    current_issue: issueName,
    generated_at: localTimestamp(),
    issues: [
      {
        ...issueData,
        articles: hydratedArticles,
      },
    ],
  });
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
