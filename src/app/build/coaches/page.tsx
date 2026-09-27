import type { Metadata } from "next";
import BuildLanding from "../BuildLanding";
import { COACH_HUB } from "@/lib/coach-pages";

// Coaches & consultants hub: picks up each branch below the hero.
export const metadata: Metadata = {
  title: { absolute: `${COACH_HUB.headline} ${COACH_HUB.highlight} | LeadScoreAI Quiz Builder` },
  description: COACH_HUB.sub,
  openGraph: { title: `${COACH_HUB.headline} ${COACH_HUB.highlight}`, description: COACH_HUB.sub, siteName: "LeadScoreAI" },
};

export default function CoachesPage() {
  return <BuildLanding page={COACH_HUB} />;
}
