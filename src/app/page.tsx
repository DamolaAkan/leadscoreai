import type { Metadata } from "next";
import BuildLanding from "./build/BuildLanding";
import { DEFAULT_PAGE } from "@/lib/builder-industries";

// app.leadscoreai.com is the quiz builder's front door; client sign-in lives at /login.
export const metadata: Metadata = {
  title: { absolute: "Tired of time-wasting enquiries? Let our scorecard find your buyers. | LeadScoreAI" },
  description:
    "Describe your business in plain words. LeadScoreAI builds the questions, the results page and a WhatsApp link, so every customer tells you what they need before you reply. Build it free, pay only when you go live.",
  openGraph: {
    title: "Tired of time-wasting enquiries? Let our scorecard find your buyers.",
    description:
      "Build a Buyer Scorecard for your business in one chat. Share it on WhatsApp and see who's ready to buy.",
    siteName: "LeadScoreAI",
  },
};

export default function HomePage() {
  return <div style={{ fontFamily: "var(--font-inter)" }}><BuildLanding page={DEFAULT_PAGE} /></div>;
}
