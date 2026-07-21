"use client";

import { useMemo, useState } from "react";

type Paragraph = {
  id: string;
  en: string;
  zh: string;
};

type Article = {
  id: string;
  order: number;
  section: string;
  title_en: string;
  title_zh: string;
  rubric_en: string;
  rubric_zh: string;
  date: string;
  translation_status: string;
  paragraphs: Paragraph[];
};

type Issue = {
  issue: string;
  title: string;
  article_count: number;
  translated_count?: number;
  articles: Article[];
};

type SiteContent = {
  current_issue: string;
  issues: Issue[];
};

export function ReaderApp({ content }: { content: SiteContent }) {
  const issue = content.issues[0];
  const translatedArticles = issue.articles.filter(
    (article) => article.translation_status === "translated",
  );
  const readableArticles =
    translatedArticles.length > 0 ? translatedArticles : issue.articles;
  const firstReadableArticle = readableArticles[0];
  const [activeId, setActiveId] = useState(firstReadableArticle?.id ?? "");
  const [inverted, setInverted] = useState(false);
  const [query, setQuery] = useState("");

  const activeArticle =
    readableArticles.find((article) => article.id === activeId) ??
    firstReadableArticle;

  const filteredArticles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return readableArticles;
    return readableArticles.filter((article) =>
      [article.title_en, article.title_zh, article.section]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [readableArticles, query]);

  const translatedCount =
    issue.translated_count ??
    issue.articles.filter((article) => article.translation_status === "translated").length;

  return (
    <main className="reader-shell">
      <aside className="issue-panel" aria-label="Article list">
        <div className="brand-row">
          <div>
            <p className="brand-kicker">The Economist</p>
            <h1>双语交替阅读</h1>
          </div>
          <span className="issue-pill">{issue.issue}</span>
        </div>

        <div className="stats-grid" aria-label="Issue status">
          <div>
            <span>{issue.article_count}</span>
            <small>Articles</small>
          </div>
          <div>
            <span>{translatedCount}</span>
            <small>Translated</small>
          </div>
        </div>

        <label className="search-box">
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title or section"
          />
        </label>

        <nav className="article-list">
          {filteredArticles.map((article) => (
            <button
              className={article.id === activeArticle.id ? "article-link active" : "article-link"}
              key={article.id}
              onClick={() => setActiveId(article.id)}
              type="button"
            >
              <span className="article-meta">
                {String(article.order).padStart(2, "0")} · {article.section}
              </span>
              <span className="article-title">{article.title_zh || article.title_en}</span>
              <span className="article-subtitle">{article.title_en}</span>
            </button>
          ))}
        </nav>
      </aside>

      <article className="article-reader">
        <header className="article-header">
          <div>
            <p className="section-label">{activeArticle.section}</p>
            <h2>{activeArticle.title_zh || activeArticle.title_en}</h2>
            <p className="english-title">{activeArticle.title_en}</p>
            {activeArticle.rubric_zh || activeArticle.rubric_en ? (
              <p className="rubric">{activeArticle.rubric_zh || activeArticle.rubric_en}</p>
            ) : null}
          </div>

          <div className="reader-actions">
            <span className="date-label">{activeArticle.date}</span>
            <button
              type="button"
              aria-pressed={inverted}
              title={inverted ? "当前从英文开始交替" : "当前从中文开始交替"}
              onClick={() => setInverted((value) => !value)}
            >
              切换段落语言
            </button>
          </div>
        </header>

        <div className="paragraphs">
          {activeArticle.paragraphs.map((paragraph, index) => {
            const showChinese = inverted ? index % 2 === 1 : index % 2 === 0;
            const text = showChinese
              ? paragraph.zh || "（待翻译）此段中文译文尚未生成。"
              : paragraph.en;
            return (
              <p
                className={showChinese ? "paragraph paragraph-zh" : "paragraph paragraph-en"}
                key={paragraph.id}
                lang={showChinese ? "zh-CN" : "en"}
              >
                <span className="paragraph-index">{String(index + 1).padStart(2, "0")}</span>
                {text}
              </p>
            );
          })}
        </div>
      </article>
    </main>
  );
}
