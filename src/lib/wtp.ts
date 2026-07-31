// Willingness-To-Pay index — the deterministic, day-1 score.
//
// This is Stage 1: a transparent 0-100 index built purely from the WTP-signal
// questions on the scorecard. It needs no conversion/outcome data, so every lead
// gets a number the moment they finish. It sits beside the qualification tier and
// never modifies it.
//
// Stage 2 (calibrated) is the existing rubric engine: once an org/industry has
// enough real OUTCOMES, the Claude-generated rubric re-weights the signals against
// what actually predicted repayment, and the score graduates from "index" to
// "calibrated". Until then we are honest: mode = "index", confidence grows with how
// many of the money questions the lead actually answered.

// Outcomes needed before the calibrated (rubric) score can be trusted, per vertical.
// Pooled across clients in an industry, crossed once — not per client.
export const WTP_CALIBRATION_THRESHOLD = 100;

export type WtpConfidence = "low" | "medium" | "high";
export type WtpMode = "index" | "calibrated";

export interface WtpFactor {
  question: string;
  earned: number;
  max: number;
  pct: number; // 0-100, this signal's own strength
}

export interface WtpIndex {
  score: number; // 0-100
  confidence: WtpConfidence;
  mode: WtpMode;
  factors: WtpFactor[];
  answeredSignals: number;
  totalSignals: number;
}

interface QuestionLike {
  id: string;
  question_text: string;
  max_points: number;
  wtp_signal?: boolean | null;
}

interface AnswerLike {
  question_id: string;
  points_awarded: number;
}

// Compute the deterministic WTP index from a lead's answers to the WTP-signal
// questions. `outcomeCount` is how many real outcomes back this vertical; once it
// clears the threshold the mode flips to "calibrated" (the rubric takes over).
export function computeWtpIndex(
  questions: QuestionLike[],
  answers: AnswerLike[],
  outcomeCount = 0
): WtpIndex {
  const signals = questions.filter((q) => q.wtp_signal);
  const totalSignals = signals.length;

  const byQuestion = new Map(answers.map((a) => [a.question_id, a]));
  const factors: WtpFactor[] = [];
  let earnedSum = 0;
  let maxSum = 0;

  for (const q of signals) {
    const a = byQuestion.get(q.id);
    if (!a) continue; // unanswered money question — lowers coverage/confidence
    const max = q.max_points || 0;
    const earned = Math.max(0, Math.min(a.points_awarded ?? 0, max));
    earnedSum += earned;
    maxSum += max;
    factors.push({
      question: q.question_text,
      earned,
      max,
      pct: max > 0 ? Math.round((earned / max) * 100) : 0,
    });
  }

  const answeredSignals = factors.length;
  const score = maxSum > 0 ? Math.round((earnedSum / maxSum) * 100) : 0;

  // Confidence from coverage: did they answer the money questions at all?
  // Even full coverage stays "medium" at index stage — "high" is reserved for
  // the calibrated score once outcomes have validated the weights.
  const coverage = totalSignals > 0 ? answeredSignals / totalSignals : 0;
  const calibrated = outcomeCount >= WTP_CALIBRATION_THRESHOLD;
  let confidence: WtpConfidence;
  if (calibrated && coverage >= 0.75) confidence = "high";
  else if (coverage >= 0.75) confidence = "medium";
  else if (coverage >= 0.4) confidence = "low";
  else confidence = "low";

  // Strongest factors first, so the UI can show reason codes.
  factors.sort((a, b) => b.pct - a.pct);

  return {
    score,
    confidence,
    mode: calibrated ? "calibrated" : "index",
    factors,
    answeredSignals,
    totalSignals,
  };
}

// Human label for the WTP band, credit-score style.
export function wtpBand(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Very high", color: "#16a34a" };
  if (score >= 60) return { label: "High", color: "#2563eb" };
  if (score >= 40) return { label: "Moderate", color: "#f59e0b" };
  return { label: "Low", color: "#dc2626" };
}
