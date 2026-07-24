import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the bilingual magazine reader", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>DuoRead<\/title>/i);
  assert.match(html, /DuoRead/);
  assert.doesNotMatch(html, /<h1>双语交替阅读<\/h1>/);
  assert.doesNotMatch(html, /issue-pill/);
  assert.match(html, /穿插语言/);
  assert.match(html, /点击正文以切换语言/);
  assert.match(html, /<span>Magazine<\/span>/);
  assert.match(html, /<span>Issue<\/span>/);
  assert.match(html, /<span>Article<\/span>/);
  assert.match(html, /Politics/);
  assert.doesNotMatch(html, /漫画：霍尔木兹海峡局势持续不明朗/);
  assert.match(html, /文章载入中/);
  assert.doesNotMatch(html, /data-paragraph-index="0"/);
  assert.ok(Buffer.byteLength(html) < 1_000_000);
  assert.doesNotMatch(html, /<span>Search<\/span>/);
  assert.doesNotMatch(html, /date-label/);
  assert.doesNotMatch(html, /<small>Articles<\/small>|<small>Translated<\/small>/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site|codex-preview/i);
});

test("site data is generated from texts", async () => {
  const siteIndex = JSON.parse(
    await readFile(new URL("../texts/site-index.json", import.meta.url), "utf8"),
  );
  const issue = siteIndex.issues.find(
    (candidate) => candidate.publication === "economist" && candidate.issue === "2026-07-18",
  );
  assert.ok(issue);
  assert.equal(issue.issue, "2026-07-18");
  assert.equal(issue.article_count, 70);
  assert.ok(siteIndex.issues.length >= 1);
  assert.ok(issue.articles.length >= 60);
  assert.equal(
    issue.articles.some((article) => /^cartoon\b\s*:/i.test(article.title_en)),
    false,
  );
  assert.equal(
    siteIndex.issues
      .flatMap((candidate) => candidate.articles)
      .some((article) => article.translation_status !== "translated"),
    false,
  );
  assert.equal(issue.articles[0].paragraphs, undefined);
  assert.match(issue.articles[0].content_path, /^\/content\/economist\/2026-07-18\//);
  assert.ok(issue.articles[0].paragraph_count > 5);

  const article = JSON.parse(
    await readFile(
      new URL(`../public${issue.articles[0].content_path}`, import.meta.url),
      "utf8",
    ),
  );
  assert.ok(article.paragraphs.length > 5);
  assert.equal(article.paragraphs[0].id, "p001");
});
