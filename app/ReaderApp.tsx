"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";

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
  published_at?: string;
  published_date_source?: string;
  translation_status: string;
  paragraphs: Paragraph[];
};

type Issue = {
  publication: string;
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

type ReadingMode = "interleaved" | "single";
type Language = "zh" | "en";
type ReaderSelection = {
  issue: string;
  article: string;
};

const selectionCookieName = "duoread_selection";

export function ReaderApp({ content }: { content: SiteContent }) {
  const firstIssue = content.issues[0];
  const [activeIssueKey, setActiveIssueKey] = useState(issueKey(firstIssue));
  const [activeId, setActiveId] = useState("");
  const [selectionLoaded, setSelectionLoaded] = useState(false);
  const [readingMode, setReadingMode] = useState<ReadingMode>("interleaved");
  const [interleavedLanguage, setInterleavedLanguage] = useState<Language>("zh");
  const [singleLanguage, setSingleLanguage] = useState<Language>("zh");
  const paragraphsRef = useRef<HTMLDivElement | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const pendingScrollAnchorRef = useRef<{ index: string; top: number } | null>(null);

  const issue =
    content.issues.find((candidate) => issueKey(candidate) === activeIssueKey) ?? firstIssue;
  const readableArticles = readableIssueArticles(issue);
  const firstReadableArticle = readableArticles[0];

  const activeArticle =
    readableArticles.find((article) => article.id === activeId) ?? firstReadableArticle;

  useLayoutEffect(() => {
    const anchor = pendingScrollAnchorRef.current;
    pendingScrollAnchorRef.current = null;
    if (!anchor) return;

    const paragraph = paragraphsRef.current?.querySelector<HTMLElement>(
      `[data-paragraph-index="${anchor.index}"]`,
    );
    if (!paragraph) return;

    const nextTop = paragraph.getBoundingClientRect().top;
    window.scrollBy({ top: nextTop - anchor.top, behavior: "auto" });
  }, [activeArticle?.id, interleavedLanguage, readingMode, singleLanguage]);

  useEffect(() => {
    const savedSelection = readSelectionCookie();
    if (savedSelection) {
      const savedIssue = content.issues.find(
        (candidate) => issueKey(candidate) === savedSelection.issue,
      );
      const savedArticles = readableIssueArticles(savedIssue);
      const savedArticle = savedArticles.find((article) => article.id === savedSelection.article);
      if (savedIssue) {
        setActiveIssueKey(issueKey(savedIssue));
        setActiveId(savedArticle?.id ?? savedArticles[0]?.id ?? "");
      }
    }
    setSelectionLoaded(true);
  }, [content.issues]);

  useEffect(() => {
    if (!selectionLoaded || !issue || !activeArticle) return;
    writeSelectionCookie({
      issue: issueKey(issue),
      article: activeArticle.id,
    });
  }, [activeArticle, issue, selectionLoaded]);

  if (!issue || !activeArticle) {
    return (
      <main className="empty-shell">
        <h1>DuoRead</h1>
        <p>暂无已完成翻译的文章。</p>
      </main>
    );
  }

  const activeDate = activeArticle.published_at ?? activeArticle.date;
  const activeDateLabel =
    activeArticle.published_date_source === "article" ? "文章日期" : "杂志发布日期";
  const modeLabel =
    readingMode === "interleaved"
      ? "穿插语言"
      : `一种语言 · ${singleLanguage === "zh" ? "中文" : "English"}`;

  function handleReaderPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function handleReaderPointerUp(event: PointerEvent<HTMLElement>) {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;
    if (isInteractiveTarget(event.target)) return;

    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved > 8) return;

    const paragraph = findParagraphElement(event.target);
    if (paragraph) {
      pendingScrollAnchorRef.current = {
        index: paragraph.dataset.paragraphIndex ?? "",
        top: paragraph.getBoundingClientRect().top,
      };
    }

    if (readingMode === "single") {
      setSingleLanguage((language) => (language === "zh" ? "en" : "zh"));
    } else {
      setInterleavedLanguage((language) => (language === "zh" ? "en" : "zh"));
    }
  }

  return (
    <main className="reader-shell">
      <aside className="issue-panel" aria-label="Article list">
        <div className="brand-row">
          <div>
            <p className="brand-title">DuoRead</p>
          </div>
        </div>

        <label className="control-field">
          <span>Magazine</span>
          <select
            value={issueKey(issue)}
            onChange={(event) => {
              const nextIssue = content.issues.find(
                (candidate) => issueKey(candidate) === event.target.value,
              );
              const nextArticles = readableIssueArticles(nextIssue);
              setActiveIssueKey(event.target.value);
              setActiveId(nextArticles[0]?.id ?? "");
            }}
          >
            {content.issues.map((candidate) => (
              <option key={issueKey(candidate)} value={issueKey(candidate)}>
                {publicationLabel(candidate.publication)} · {candidate.issue}
              </option>
            ))}
          </select>
        </label>

        <label className="control-field article-picker">
          <span>Article</span>
          <select
            value={activeArticle.id}
            onChange={(event) => setActiveId(event.target.value)}
          >
            {readableArticles.map((article) => (
              <option key={article.id} value={article.id}>
                {String(article.order).padStart(2, "0")} · {article.title_zh || article.title_en}
              </option>
            ))}
          </select>
        </label>

        <nav className="article-list">
          {readableArticles.map((article) => (
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
            <span className="date-label">
              {activeDateLabel}: {activeDate}
            </span>
            <button
              type="button"
              aria-pressed={readingMode === "single"}
              title={readingMode === "interleaved" ? "当前为穿插语言模式" : "当前为一种语言模式"}
              onClick={() =>
                setReadingMode((mode) => (mode === "interleaved" ? "single" : "interleaved"))
              }
            >
              {modeLabel}
            </button>
          </div>
        </header>

        <div
          ref={paragraphsRef}
          className="paragraphs paragraphs-clickable"
          onPointerDown={handleReaderPointerDown}
          onPointerUp={handleReaderPointerUp}
        >
          {activeArticle.paragraphs.map((paragraph, index) => {
            const showChinese =
              readingMode === "single"
                ? singleLanguage === "zh"
                : interleavedLanguage === "zh"
                  ? index % 2 === 0
                  : index % 2 === 1;
            const text = showChinese
              ? paragraph.zh || "（待翻译）此段中文译文尚未生成。"
              : paragraph.en;
            return (
              <p
                className={showChinese ? "paragraph paragraph-zh" : "paragraph paragraph-en"}
                data-paragraph-index={index}
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

function isInteractiveTarget(target: EventTarget) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("button, a, input, select, textarea, label"));
}

function findParagraphElement(target: EventTarget) {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>("[data-paragraph-index]");
}

function issueKey(issue?: Issue) {
  if (!issue) return "";
  return `${issue.publication}:${issue.issue}`;
}

function readableIssueArticles(issue?: Issue) {
  if (!issue) return [];
  const translatedArticles = issue.articles.filter(
    (article) => article.translation_status === "translated",
  );
  return translatedArticles.length > 0 ? translatedArticles : issue.articles;
}

function readSelectionCookie(): ReaderSelection | null {
  if (typeof document === "undefined") return null;
  const encodedValue = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${selectionCookieName}=`))
    ?.slice(selectionCookieName.length + 1);
  if (!encodedValue) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(encodedValue)) as Partial<ReaderSelection>;
    if (typeof parsed.issue !== "string" || typeof parsed.article !== "string") return null;
    return { issue: parsed.issue, article: parsed.article };
  } catch {
    return null;
  }
}

function writeSelectionCookie(selection: ReaderSelection) {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(selection));
  document.cookie = `${selectionCookieName}=${value}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

function publicationLabel(publication: string) {
  const labels: Record<string, string> = {
    economist: "The Economist",
    new_yorker: "The New Yorker",
    atlantic: "The Atlantic",
    wired: "Wired",
  };
  return labels[publication] ?? publication;
}
