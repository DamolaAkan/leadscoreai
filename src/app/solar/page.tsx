import type { Metadata } from "next";
import SolarScorecard from "./SolarScorecard";
import MetaPixel, { SOLAR_PIXEL_ID } from "@/components/MetaPixel";

const TITLE = "Solar Fit Assessment | LeadScoreAI";
const DESCRIPTION =
  "Are your solar leads actually ready to buy? Take the 2-minute Solar Fit assessment and claim a free scorecard for your own enquiries.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://app.leadscoreai.com/solar",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const dynamic = "force-dynamic";

export default function SolarPage() {
  return (
    <div className="sc-page">
      <MetaPixel pixelId={SOLAR_PIXEL_ID} />
      <SolarScorecard />
    </div>
  );
}
