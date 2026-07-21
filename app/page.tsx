import siteContent from "../texts/site-index.json";
import { ReaderApp } from "./ReaderApp";

export default function Home() {
  return <ReaderApp content={siteContent} />;
}
