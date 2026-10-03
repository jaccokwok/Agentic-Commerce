import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scout — Agentic Commerce Demo",
  description: "A five-agent mock shopping flow across Taobao, HKTV Mall, and Pinduoduo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
