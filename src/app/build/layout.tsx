import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Stop replying to people who won't buy. Let a quiz find your buyers. | LeadScoreAI" },
  description:
    "Describe your business in plain words. LeadScoreAI builds the questions, the results page and a WhatsApp link, so every customer tells you what they need before you reply. Build it free, pay only when you go live.",
};

export default function BuildLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: "var(--font-inter)" }}>{children}</div>;
}
