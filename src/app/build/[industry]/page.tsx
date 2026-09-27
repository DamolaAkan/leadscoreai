import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BuildLanding from "../BuildLanding";
import { INDUSTRY_PAGES, getIndustryPage } from "@/lib/builder-industries";

// Per-industry landing pages: /build/study-abroad, /build/skincare, ...
export const dynamicParams = false;

export function generateStaticParams() {
  // /build/coaches has its own route (hub + branch pages).
  return INDUSTRY_PAGES.filter((p) => p.slug !== "coaches").map((p) => ({ industry: p.slug }));
}

export function generateMetadata({ params }: { params: { industry: string } }): Metadata {
  const page = getIndustryPage(params.industry);
  if (!page) return {};
  const title = `${page.headline} ${page.highlight}`;
  return {
    title: { absolute: `${title} | LeadScoreAI Quiz Builder` },
    description: page.sub,
    openGraph: { title, description: page.sub, siteName: "LeadScoreAI" },
  };
}

export default function IndustryBuildPage({ params }: { params: { industry: string } }) {
  const page = getIndustryPage(params.industry);
  if (!page) notFound();
  return <BuildLanding page={page} />;
}
