import type { Metadata } from "next";
import MortgageScorecard from "./MortgageScorecard";
import MetaPixel, { META_PIXEL_ID } from "@/components/MetaPixel";

const TITLE = "Mortgage Fit Assessment | LeadScoreAI";
const DESCRIPTION =
  "Tired of time-wasting mortgage enquiries? Take the 2-minute Mortgage Fit assessment and see which buyers can actually finance before you book a viewing.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://app.leadscoreai.com/mortgage",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const dynamic = "force-dynamic";

export default function MortgagePage() {
  return (
    <div className="sc-page">
      <MetaPixel pixelId={META_PIXEL_ID} />
      <MortgageScorecard />
    </div>
  );
}
