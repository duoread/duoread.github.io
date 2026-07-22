import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import * as cheerio from "cheerio";
import JSZip from "jszip";
import slugify from "slugify";
import { localTimestamp, rebuildSiteIndex } from "./site-index.mjs";

const args = parseArgs(process.argv.slice(2));
const epubPath = args.epub ?? "data/raw/economist/2026-07-18/TheEconomist.2026.07.18.epub";
const issue = args.issue ?? inferIssue(epubPath);
const publication = args.publication ?? "economist";
const outputRoot = args.out ?? path.join("texts", publication, issue);
const issuePublishedAt = args.published_at ?? issue;

const raw = await readFile(epubPath);
const zip = await JSZip.loadAsync(raw);
const packageInfo = await readPackageInfo(zip);
const entries = await readNavigationEntries(zip, packageInfo);

await rm(outputRoot, { recursive: true, force: true });
await mkdir(path.join(outputRoot, "articles"), { recursive: true });

const articles = [];
let order = 0;

for (const entry of entries) {
  const htmlPath = resolveZipPath(packageInfo.baseDir, entry.href);
  const html = await readZipText(zip, htmlPath).catch(() => null);
  if (!html) continue;

  const article = parseArticle(html, entry, htmlPath);
  if (!article || article.paragraphs.length < 2) continue;

  order += 1;
  const slug = `${String(order).padStart(3, "0")}-${toSlug(article.title_en)}`;
  const articleDir = path.join(outputRoot, "articles", slug);
  await mkdir(articleDir, { recursive: true });
  const publishedDate = resolvePublishedDate(article.date, issuePublishedAt);

  const bilingual = {
    id: slug,
    source_href: entry.href,
    publication,
    issue,
    issue_published_at: issuePublishedAt,
    article_published_at: article.date,
    published_at: publishedDate.value,
    published_date_source: publishedDate.source,
    order,
    section: article.section,
    title_en: article.title_en,
    title_zh: "",
    rubric_en: article.rubric_en,
    rubric_zh: "",
    date: publishedDate.value,
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
    issue_published_at: issuePublishedAt,
    article_published_at: article.date,
    published_at: publishedDate.value,
    published_date_source: publishedDate.source,
    date: publishedDate.value,
    paragraph_count: bilingual.paragraphs.length,
    translation_status: "pending",
    path: `articles/${slug}/bilingual.json`,
  });
}

const issueJson = {
  publication,
  source_type: "magazine",
  issue,
  title: `The Economist ${issue}`,
  published_at: issuePublishedAt,
  source_epub: epubPath,
  extracted_at: localTimestamp(),
  article_count: articles.length,
  translated_count: 0,
  articles,
};

await writeJson(path.join(outputRoot, "issue.json"), issueJson);
await rebuildSiteIndex("texts");

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

function resolvePublishedDate(articleDate, issueDate) {
  const articleValue = articleDate?.trim();
  if (articleValue) {
    return { value: articleValue, source: "article" };
  }
  return { value: issueDate, source: "issue" };
}

async function readZipText(zip, name) {
  const file = zip.file(name);
  if (!file) throw new Error(`Missing EPUB entry: ${name}`);
  return file.async("string");
}

async function readPackageInfo(zip) {
  const container = await readZipText(zip, "META-INF/container.xml").catch(() => "");
  const $container = cheerio.load(container, { xmlMode: true });
  const opfPath =
    $container("rootfile").first().attr("full-path") ??
    Object.keys(zip.files).find((name) => /\.opf$/i.test(name));

  if (!opfPath) throw new Error("Missing EPUB package file");

  const opf = await readZipText(zip, opfPath);
  const $opf = cheerio.load(opf, { xmlMode: true });
  const baseDir = path.posix.dirname(opfPath) === "." ? "" : path.posix.dirname(opfPath);
  const manifest = new Map();

  $opf("manifest item").each((_, item) => {
    const id = $opf(item).attr("id");
    const href = $opf(item).attr("href");
    if (!id || !href) return;
    manifest.set(id, {
      href,
      mediaType: $opf(item).attr("media-type") ?? "",
      properties: $opf(item).attr("properties") ?? "",
    });
  });

  const spineIds = [];
  $opf("spine itemref").each((_, itemref) => {
    const idref = $opf(itemref).attr("idref");
    if (idref) spineIds.push(idref);
  });

  const navItem = [...manifest.values()].find((item) =>
    item.properties.split(/\s+/).includes("nav"),
  );
  const ncxItem =
    manifest.get($opf("spine").first().attr("toc") ?? "") ??
    [...manifest.values()].find((item) => /ncx$/i.test(item.mediaType) || /toc\.ncx$/i.test(item.href));

  return { baseDir, manifest, navItem, ncxItem, spineIds };
}

async function readNavigationEntries(zip, packageInfo) {
  if (packageInfo.navItem) {
    const navPath = resolveZipPath(packageInfo.baseDir, packageInfo.navItem.href);
    const navHtml = await readZipText(zip, navPath);
    return parseNav(navHtml);
  }

  if (packageInfo.ncxItem) {
    const ncxPath = resolveZipPath(packageInfo.baseDir, packageInfo.ncxItem.href);
    const ncx = await readZipText(zip, ncxPath);
    return parseNcx(ncx);
  }

  return packageInfo.spineIds
    .map((id) => packageInfo.manifest.get(id))
    .filter((item) => item?.href && /x?html?$/i.test(item.href))
    .map((item) => ({ section: "", href: item.href, title: path.basename(item.href) }));
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

function parseNcx(xml) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const entries = [];

  $("navPoint").each((_, node) => {
    const $node = $(node);
    if ($node.children("navPoint").length > 0) return;
    const href = ($node.children("content").first().attr("src") ?? "").split("#")[0];
    const title = cleanText($node.children("navLabel").first().find("text").first().text());
    const section = cleanText(
      $node.parent().closest("navPoint").children("navLabel").first().find("text").first().text(),
    );
    if (!href || !title || !/\.x?html?$/i.test(href)) return;
    entries.push({ section, href, title });
  });

  return entries;
}

function parseArticle(html, entry, htmlPath) {
  const $ = cheerio.load(html);
  $("script, style, nav, img, figure, .link_navbar").remove();

  const section =
    cleanText($(".te_section_title").first().text()) ||
    cleanText($("[data-testid='ContentHeaderRubric'] a").first().text()) ||
    entry.section;
  const title_en =
    cleanText($(".te_article_title").first().text()) ||
    cleanText($("[data-testid='ContentHeaderHed']").first().text()) ||
    cleanText($("h1").first().text()) ||
    entry.title;
  const rubric_en =
    cleanText($(".te_article_rubric").first().text()) ||
    cleanText($("[data-testid='ContentHeaderAccreditation']").first().text()) ||
    cleanText($("h2").first().text());
  const date =
    cleanText($(".te_article_datePublished").first().text()) ||
    cleanText($("time[datetime]").first().attr("datetime") ?? "") ||
    cleanText($("time").first().text());
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
    if (/^by [A-Z]/.test(text)) return;
    if (/^(Next|Previous|Section menu|Main menu)$/i.test(text)) return;
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
    .replace(/<\/?[^>]+>/g, "")
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

function resolveZipPath(baseDir, href) {
  const cleanHref = href.split("#")[0];
  return path.posix.normalize(baseDir ? path.posix.join(baseDir, cleanHref) : cleanHref);
}
