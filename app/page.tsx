import siteContent from "../texts/site-index.json";
import { ReaderApp } from "./ReaderApp";

export default function Home() {
  const translatedContent = {
    ...siteContent,
    issues: siteContent.issues
      .map((issue) => ({
        ...issue,
        articles: issue.articles.filter(
          (article) => article.translation_status === "translated",
        ),
      }))
      .filter((issue) => issue.articles.length > 0),
  };

  return <ReaderApp content={translatedContent} />;
}
