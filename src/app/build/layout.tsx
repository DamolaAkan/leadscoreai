import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quiz Builder: create a quiz by chatting",
  description:
    "Describe your business and LeadScoreAI builds a beautiful quiz that qualifies your customers or recommends the right product. Publish a link or embed it on your website.",
};

export default function BuildLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: "var(--font-inter)" }}>{children}</div>;
}
