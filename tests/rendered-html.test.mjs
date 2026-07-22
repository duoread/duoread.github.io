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
  assert.match(html, /<title>双语交替阅读<\/title>/i);
  assert.match(html, /Parallel Reader/);
  assert.match(html, /穿插语言/);
  assert.match(html, /Politics/);
  assert.match(html, /漫画：霍尔木兹海峡局势持续不明朗/);
  assert.match(html, /深入了解这幅漫画涉及的主题/);
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
  assert.ok(issue.articles[0].paragraphs.length > 5);
  assert.equal(issue.articles[0].paragraphs[0].id, "p001");
});
