import type { Metadata } from "next";
import SolarScorecard from "./SolarScorecard";
import MetaPixel from "@/components/MetaPixel";

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
    <div
      style={{
        minHeight: "100vh",
        background: "#faf7f2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily:
          "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
      }}
    >
      <MetaPixel />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <SolarScorecard />
    </div>
  );
}
