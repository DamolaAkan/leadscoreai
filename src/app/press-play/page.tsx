import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PressPlaySignup from "./PressPlaySignup";

export const metadata: Metadata = {
  title: "Press play on solar leads | LeadScoreAI",
  description: "Tell us about your solar business, pick a scorecard, top up and press play.",
};

// Off until PRESS_PLAY_ENABLED is on, like the rest of press-play.
export default function PressPlayPage() {
  if (process.env.PRESS_PLAY_ENABLED !== "1") notFound();
  return <PressPlaySignup />;
}
