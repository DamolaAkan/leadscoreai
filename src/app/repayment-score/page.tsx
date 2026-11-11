import type { Metadata } from "next";
import RepaymentScore from "./RepaymentScore";
import { RS_COPY } from "@/lib/repayment-score";

const TITLE = "Repayment Score: the seven-part repayment review";
const DESCRIPTION =
  "What is the number one thing holding back your collections? Get your Repayment Score across the seven parts of a complete repayment system, and a 90-day plan built from your answers.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | LeadScoreAI` },
  description: DESCRIPTION,
  openGraph: {
    title: RS_COPY.headline,
    description: DESCRIPTION,
    url: "https://app.leadscoreai.com/repayment-score",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: RS_COPY.headline, description: DESCRIPTION },
};

export default function RepaymentScorePage() {
  return <RepaymentScore />;
}
