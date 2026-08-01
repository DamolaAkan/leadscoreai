// Stage-2 WTP calibration: train the score against REAL outcomes.
//
// This is the graduation. Once a vertical has enough labeled outcomes (good/bad),
// we learn, per WTP-signal question and per answer, the actual rate of good
// outcomes, then re-score every lead against those learned rates. The number stops
// being a directional index and becomes a calibrated rating. Deterministic and
// explainable — no LLM in the scoring path (the LLM stays for narrative only).

import { WTP_CALIBRATION_THRESHOLD, WtpConfidence } from "./wtp";
import { createServiceClient } from "./supabase";

type Db = ReturnType<typeof createServiceClient>;

// Laplace-style smoothing so a tiny answer bucket can't swing the weight; it
// shrinks toward the population base rate until it has enough samples.
const SMOOTH = 5;

interface TrainingRow {
  outcomeGood: boolean; // true = good, false = bad
  answers: { question_id: string; points_awarded: number }[];
}

export interface OutcomeRubric {
  kind: "outcome-deterministic";
  baseRate: number; // overall P(good)
  trainingSize: number;
  // question_id -> points bucket -> learned good-rate
  signals: Record<string, { questionText?: string; buckets: Record<string, { goodRate: number; n: number }> }>;
}

export function buildOutcomeRubric(
  training: TrainingRow[],
  questionText: Record<string, string> = {}
): OutcomeRubric {
  const goods = training.filter((t) => t.outcomeGood).length;
  const baseRate = training.length > 0 ? goods / training.length : 0.5;

  // Tally goods/total per (question, points bucket).
  const tally: Record<string, Record<string, { good: number; total: number }>> = {};
  for (const row of training) {
    for (const a of row.answers) {
      const q = (tally[a.question_id] ??= {});
      const b = (q[String(a.points_awarded)] ??= { good: 0, total: 0 });
      b.total++;
      if (row.outcomeGood) b.good++;
    }
  }

  const signals: OutcomeRubric["signals"] = {};
  for (const [qid, buckets] of Object.entries(tally)) {
    const out: Record<string, { goodRate: number; n: number }> = {};
    for (const [pts, c] of Object.entries(buckets)) {
      // Smoothed good-rate: (good + baseRate*SMOOTH) / (total + SMOOTH)
      out[pts] = {
        goodRate: (c.good + baseRate * SMOOTH) / (c.total + SMOOTH),
        n: c.total,
      };
    }
    signals[qid] = { questionText: questionText[qid], buckets: out };
  }

  return { kind: "outcome-deterministic", baseRate, trainingSize: training.length, signals };
}

export interface CalibratedScore {
  score: number; // 0-100
  confidence: WtpConfidence;
  factors: { question: string; earned: number; max: number; pct: number }[];
}

// Score one lead against the learned rubric. Falls back to the base rate for any
// signal we have no learned bucket for, so a lead always gets a number.
export function scoreWithOutcomeRubric(
  rubric: OutcomeRubric,
  answers: { question_id: string; points_awarded: number }[]
): CalibratedScore {
  const rates: number[] = [];
  const factors: { question: string; earned: number; max: number; pct: number }[] = [];

  for (const a of answers) {
    const sig = rubric.signals[a.question_id];
    if (!sig) continue; // not a WTP-signal question
    const bucket = sig.buckets[String(a.points_awarded)];
    const rate = bucket ? bucket.goodRate : rubric.baseRate;
    rates.push(rate);
    const pct = Math.round(rate * 100);
    factors.push({ question: sig.questionText || "Signal", earned: pct, max: 100, pct });
  }

  const raw = rates.length > 0 ? rates.reduce((s, r) => s + r, 0) / rates.length : rubric.baseRate;
  const score = Math.round(raw * 100);
  const coverage = Object.keys(rubric.signals).length
    ? rates.length / Object.keys(rubric.signals).length
    : 0;
  const confidence: WtpConfidence = coverage >= 0.75 ? "high" : coverage >= 0.4 ? "medium" : "low";
  factors.sort((x, y) => y.pct - x.pct);
  return { score, confidence, factors };
}

// Train + store + re-score for one org. Returns a summary. Best-effort caller
// should ignore errors. Only calibrates once the outcome threshold is cleared.
export async function calibrateOrg(
  sb: Db,
  orgId: string
): Promise<{ calibrated: boolean; trainingSize: number; needed: number; rescored: number }> {
  // WTP-signal questions for this org (keyed by question_id across all its quizzes).
  const { data: quizRows } = await sb
    .from("quizzes")
    .select("id")
    .eq("organization_id", orgId);
  const quizIds = (quizRows || []).map((q: { id: string }) => q.id);
  if (quizIds.length === 0) return { calibrated: false, trainingSize: 0, needed: WTP_CALIBRATION_THRESHOLD, rescored: 0 };

  const { data: qs } = await sb
    .from("quiz_questions")
    .select("id, question_text")
    .in("quiz_id", quizIds)
    .eq("wtp_signal", true);
  const wtpQ = (qs || []) as { id: string; question_text: string }[];
  const wtpIds = wtpQ.map((q) => q.id);
  const qText: Record<string, string> = {};
  wtpQ.forEach((q) => (qText[q.id] = q.question_text));
  if (wtpIds.length === 0) return { calibrated: false, trainingSize: 0, needed: WTP_CALIBRATION_THRESHOLD, rescored: 0 };

  // Training set: every completed lead, labeled simply by whether it converted.
  // One binary outcome the client actually maintains — no lifecycle to track.
  const { data: convRows } = await sb
    .from("quiz_responses")
    .select("id, converted_to_sale")
    .eq("organization_id", orgId)
    .not("completed_at", "is", null);
  const trainRows = (convRows || []) as { id: string; converted_to_sale: boolean | null }[];
  const conversions = trainRows.filter((r) => r.converted_to_sale).length;
  if (conversions < WTP_CALIBRATION_THRESHOLD) {
    return { calibrated: false, trainingSize: conversions, needed: WTP_CALIBRATION_THRESHOLD, rescored: 0 };
  }

  const convById = new Map(trainRows.map((r) => [r.id, !!r.converted_to_sale]));
  const { data: trainAns } = await sb
    .from("response_answers")
    .select("response_id, question_id, points_awarded")
    .in("response_id", trainRows.map((r) => r.id))
    .in("question_id", wtpIds);

  const trainByResp = new Map<string, { question_id: string; points_awarded: number }[]>();
  for (const a of (trainAns || []) as { response_id: string; question_id: string; points_awarded: number }[]) {
    (trainByResp.get(a.response_id) ?? trainByResp.set(a.response_id, []).get(a.response_id)!).push(a);
  }
  const training: TrainingRow[] = trainRows.map((r) => ({
    outcomeGood: convById.get(r.id) === true,
    answers: trainByResp.get(r.id) || [],
  }));

  const rubric = buildOutcomeRubric(training, qText);

  // Store the rubric (deterministic, outcome-trained).
  await sb.from("wtp_rubrics").insert({
    organization_id: orgId,
    rubric,
    model: "deterministic-conversions",
    summary: `Calibrated on ${conversions} conversions across ${training.length} leads. Base conversion rate ${Math.round(rubric.baseRate * 100)}%.`,
    super_lead_threshold: 80,
  });

  // Re-score every completed lead against the learned rubric.
  const { data: completed } = await sb
    .from("quiz_responses")
    .select("id")
    .eq("organization_id", orgId)
    .not("completed_at", "is", null)
    .limit(5000);
  const completedIds = ((completed || []) as { id: string }[]).map((r) => r.id);

  const { data: allAns } = await sb
    .from("response_answers")
    .select("response_id, question_id, points_awarded")
    .in("response_id", completedIds)
    .in("question_id", wtpIds);
  const ansByResp = new Map<string, { question_id: string; points_awarded: number }[]>();
  for (const a of (allAns || []) as { response_id: string; question_id: string; points_awarded: number }[]) {
    (ansByResp.get(a.response_id) ?? ansByResp.set(a.response_id, []).get(a.response_id)!).push(a);
  }

  const now = new Date().toISOString();
  let rescored = 0;
  for (const id of completedIds) {
    const scored = scoreWithOutcomeRubric(rubric, ansByResp.get(id) || []);
    await sb
      .from("quiz_responses")
      .update({
        wtp_score: scored.score,
        wtp_confidence: scored.confidence,
        wtp_mode: "calibrated",
        wtp_factors: scored.factors,
        wtp_scored_at: now,
      })
      .eq("id", id);
    rescored++;
  }

  return { calibrated: true, trainingSize: conversions, needed: WTP_CALIBRATION_THRESHOLD, rescored };
}
