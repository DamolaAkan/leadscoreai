import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "One chat. A quiz that finds your buyers. | LeadScoreAI" },
  description:
    "Describe your business in plain words. LeadScoreAI builds the questions, the results page and a WhatsApp link, so every customer tells you what they need before you reply. Free for 7 days.",
};

export default function BuildLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: "var(--font-inter)" }}>{children}</div>;
}
