import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "双语交替阅读",
  description: "按自然段交替展示中英文的多来源阅读站。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
