import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BuildLanding from "../../BuildLanding";
import { COACH_BRANCHES, coachBranchPage, getCoachBranch } from "@/lib/coach-pages";

// One page per coaching / consulting branch: /build/coaches/fitness, …
export const dynamicParams = false;

export function generateStaticParams() {
  return COACH_BRANCHES.map((b) => ({ branch: b.key }));
}

export function generateMetadata({ params }: { params: { branch: string } }): Metadata {
  const b = getCoachBranch(params.branch);
  if (!b) return {};
  const page = coachBranchPage(b);
  const title = `${page.headline} ${page.highlight}`;
  return {
    title: { absolute: `${title} | LeadScoreAI Quiz Builder` },
    description: page.sub,
    openGraph: { title, description: page.sub, siteName: "LeadScoreAI" },
  };
}

export default function CoachBranchPage({ params }: { params: { branch: string } }) {
  const b = getCoachBranch(params.branch);
  if (!b) notFound();
  return <BuildLanding page={coachBranchPage(b)} />;
}
