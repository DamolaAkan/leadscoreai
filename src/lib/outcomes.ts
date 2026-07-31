// Outcome lifecycle for the WTP calibration loop. A scorecard response is an
// applicant; clients report what happened, and the label is the training signal.

export type OutcomeStage =
  | "approved"
  | "disbursed"
  | "repaying"
  | "repaid"
  | "arrears"
  | "defaulted"
  | "rejected"
  | "withdrew";

export type OutcomeLabel = "good" | "bad" | "pending" | "excluded";

export const OUTCOME_STAGES: {
  stage: OutcomeStage;
  label: OutcomeLabel;
  text: string;
  hint: string;
}[] = [
  { stage: "approved", label: "pending", text: "Approved", hint: "Loan approved, not yet disbursed" },
  { stage: "disbursed", label: "pending", text: "Disbursed", hint: "Money went out, too early to judge" },
  { stage: "repaying", label: "good", text: "Repaying on track", hint: "Paying on schedule" },
  { stage: "repaid", label: "good", text: "Fully repaid", hint: "Repaid in full" },
  { stage: "arrears", label: "bad", text: "In arrears", hint: "Behind on payments" },
  { stage: "defaulted", label: "bad", text: "Defaulted", hint: "Written off / serious default" },
  { stage: "rejected", label: "excluded", text: "Rejected", hint: "MFB declined; no repayment signal" },
  { stage: "withdrew", label: "excluded", text: "Withdrew", hint: "Applicant did not proceed" },
];

const STAGE_TO_LABEL = new Map(OUTCOME_STAGES.map((o) => [o.stage, o.label]));

export function labelForStage(stage: string): OutcomeLabel | null {
  return STAGE_TO_LABEL.get(stage as OutcomeStage) ?? null;
}

export function outcomeMeta(stage: string | null | undefined) {
  return OUTCOME_STAGES.find((o) => o.stage === stage) ?? null;
}

// Colour for a label, for badges.
export function labelColor(label: string | null | undefined): string {
  switch (label) {
    case "good":
      return "#16a34a";
    case "bad":
      return "#dc2626";
    case "pending":
      return "#f59e0b";
    default:
      return "#94a3b8";
  }
}
