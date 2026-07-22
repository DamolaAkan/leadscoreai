import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";
import { getClaude, isClaudeConfigured, CLAUDE_MODEL } from "@/lib/claude";

// "Predict" step (Segment → Connect → Predict → Advise). The agent reads the
// scorecard AND the real conversion correlation (two sources of truth) and
// returns a reusable WTP rubric. We store it, then apply it deterministically to
// every lead — so scoring is cheap, explainable, and never touches qualification.

interface QuestionMeta {
  id: string;
  question_text: string;
  question_type: string;
  options: { text: string; value: number | string; points: number }[];
  wtp_signal?: boolean;
}

interface AnswerRow {
  response_id: string;
  question_id: string;
  answer_value: Record<string, unknown> | null;
  quiz_responses: { converted_to_sale: boolean | null; completed_at: string | null } | null;
}

interface RubricSignal {
  questionId: string;
  rationale: string;
  weights: { value: number; label: string; weight: number }[];
}
interface Rubric {
  signals: RubricSignal[];
  suggestedQuestions: { question: string; why: string }[];
  superLeadThreshold: number;
  summary: string;
}

const RUBRIC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["signals", "suggestedQuestions", "superLeadThreshold", "summary"],
  properties: {
    signals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["questionId", "rationale", "weights"],
        properties: {
          questionId: { type: "string" },
          rationale: { type: "string" },
          weights: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["value", "label", "weight"],
              properties: {
                value: { type: "number" },
                label: { type: "string" },
                weight: { type: "number" },
              },
            },
          },
        },
      },
    },
    suggestedQuestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "why"],
        properties: {
          question: { type: "string" },
          why: { type: "string" },
        },
      },
    },
    superLeadThreshold: { type: "number" },
    summary: { type: "string" },
  },
} as const;

function labelOf(a: AnswerRow): string | null {
  const v = a.answer_value;
  if (v && typeof v.text === "string") return v.text;
  if (v && v.selected != null) return String(v.selected);
  return null;
}

export async function POST(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await validateSession(sessionId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isClaudeConfigured()) {
    return NextResponse.json(
      { error: "The AI agent is not configured (CLAUDE_ANTHROPIC is not set)." },
      { status: 503 }
    );
  }

  const supabase = createServiceClient();
  const orgId = user.organizationId;

  // Categorical questions for this org's scorecard(s).
  const { data: qData } = await supabase
    .from("quiz_questions")
    .select("id, question_text, question_type, options, wtp_signal, quizzes!inner(organization_id)")
    .eq("quizzes.organization_id", orgId)
    .in("question_type", ["radio", "matrix"])
    .order("question_order", { ascending: true });
  const questions = (qData || []) as unknown as QuestionMeta[];
  if (questions.length === 0) {
    return NextResponse.json({ error: "No scorecard questions found." }, { status: 400 });
  }

  // Every answer for completed responses (paged past the 1k cap), with the
  // response's conversion flag so we can measure per-option conversion.
  const PAGE = 1000;
  const answers: AnswerRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("response_answers")
      .select("response_id, question_id, answer_value, quiz_responses!inner(converted_to_sale, completed_at, organization_id)")
      .eq("quiz_responses.organization_id", orgId)
      .not("quiz_responses.completed_at", "is", null)
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: "Failed to load answers." }, { status: 500 });
    const batch = (data || []) as unknown as AnswerRow[];
    answers.push(...batch);
    if (batch.length < PAGE) break;
  }

  // Per (question, option-label) conversion correlation — the empirical half.
  const corr: Record<string, Record<string, { chosen: number; converted: number }>> = {};
  for (const a of answers) {
    const label = labelOf(a);
    if (!label) continue;
    const q = (corr[a.question_id] ||= {});
    const c = (q[label] ||= { chosen: 0, converted: 0 });
    c.chosen++;
    if (a.quiz_responses?.converted_to_sale) c.converted++;
  }

  // Anonymized payload (no PII — questions, options, counts only).
  const scorecard = questions.map((q) => ({
    questionId: q.id,
    question: q.question_text,
    preTagged: !!q.wtp_signal,
    options: (q.options || []).map((o) => {
      const stat = corr[q.id]?.[o.text];
      const chosen = stat?.chosen || 0;
      const converted = stat?.converted || 0;
      return {
        value: o.value,
        label: o.text,
        chosen,
        converted,
        conversionRate: chosen > 0 ? Math.round((converted / chosen) * 1000) / 10 : null,
      };
    }),
  }));

  const system =
    "You are a willingness-to-pay (WTP) analyst for a lead-scoring platform. " +
    "A separate scorecard already tiers leads (Hot/Warm/Cold). Your job is DIFFERENT and must NEVER change that tier: " +
    "identify which answers reveal that a lead can and will actually PAY, so a rep knows who to call first. " +
    "You have two sources of truth: (1) the meaning of each question and answer, and (2) the real conversion rate of leads " +
    "who gave each answer (who actually paid). Weight answers by BOTH — semantics and evidence. Where conversion data is thin, " +
    "lean on meaning; where it's strong, let it dominate.";

  // Keep the WTP signal set TIGHT and business-owned. If the business has tagged
  // its willingness-to-pay questions (preTagged), weight ONLY those; otherwise let
  // the agent pick the ~3 most predictive. This prevents WTP from collapsing into
  // "every question is a signal".
  const taggedCount = scorecard.filter((q) => q.preTagged).length;
  const scopeInstruction =
    taggedCount > 0
      ? `The business has designated ${taggedCount} question(s) as its willingness-to-pay questions (marked "preTagged": true). Assign weights ONLY to those preTagged questions — do NOT create a signal for any other question, even if it correlates with conversion.`
      : "Choose AT MOST 3 questions that most strongly signal willingness/ability to pay (deposit ability, income, urgency, commitment, budget — not generic fit) and assign weights only to those. Keep the signal set tight — WTP should be driven by a few decisive questions, not all of them.";

  const userPrompt =
    "Here is the scorecard with per-answer conversion data (chosen = how many picked it, converted = how many later paid):\n\n" +
    JSON.stringify(scorecard, null, 2) +
    "\n\nProduce a WTP rubric:\n" +
    "- signals: " +
    scopeInstruction +
    " For each chosen question, assign every option a weight 0-10 (10 = strongest paying signal) and give a one-sentence rationale grounded in the data.\n" +
    "- suggestedQuestions: up to 3 questions this scorecard is missing that would sharpen WTP (empty array if well covered).\n" +
    "- superLeadThreshold: the 0-100 WTP score at or above which a lead should be flagged a 'super lead' (a selective top slice, not everyone).\n" +
    "- summary: 2-3 plain-language sentences on what predicts payment here.";

  let rubric: Rubric;
  try {
    const resp = await getClaude().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: { effort: "high", format: { type: "json_schema", schema: RUBRIC_SCHEMA } },
      system,
      messages: [{ role: "user", content: userPrompt }],
    });
    if (resp.stop_reason === "refusal") {
      return NextResponse.json({ error: "The agent declined this request." }, { status: 502 });
    }
    const text = resp.content.find((b) => b.type === "text");
    rubric = JSON.parse((text as { text: string }).text) as Rubric;
  } catch (e) {
    return NextResponse.json(
      { error: "Agent call failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }

  // Persist the rubric.
  await supabase.from("wtp_rubrics").insert({
    organization_id: orgId,
    rubric: rubric.signals,
    summary: rubric.summary,
    suggested_questions: rubric.suggestedQuestions,
    super_lead_threshold: Math.round(rubric.superLeadThreshold),
    model: CLAUDE_MODEL,
  });

  // Apply the rubric to every lead: weighted WTP over signal answers → 0-100.
  const weightByQV = new Map<string, number>(); // `${questionId}:${value}` -> weight
  const maxByQ = new Map<string, number>(); // questionId -> max option weight
  for (const s of rubric.signals) {
    let max = 0;
    for (const w of s.weights) {
      weightByQV.set(`${s.questionId}:${w.value}`, w.weight);
      if (w.weight > max) max = w.weight;
    }
    maxByQ.set(s.questionId, max);
  }
  const maxPossible = Array.from(maxByQ.values()).reduce((a, b) => a + b, 0);
  const threshold = Math.round(rubric.superLeadThreshold);

  // Group answers by response, keeping the selected value per question.
  const perResponse = new Map<string, { qid: string; value: number }[]>();
  for (const a of answers) {
    const sel = a.answer_value?.selected;
    if (typeof sel !== "number") continue;
    (perResponse.get(a.response_id) || perResponse.set(a.response_id, []).get(a.response_id)!).push({
      qid: a.question_id,
      value: sel,
    });
  }

  let scored = 0;
  let supers = 0;
  const updates: PromiseLike<unknown>[] = [];
  for (const [responseId, ans] of Array.from(perResponse)) {
    if (maxPossible <= 0) break;
    let sum = 0;
    for (const { qid, value } of ans) {
      sum += weightByQV.get(`${qid}:${value}`) || 0;
    }
    const wtp = Math.round((sum / maxPossible) * 100);
    const isSuper = wtp >= threshold;
    if (isSuper) supers++;
    scored++;
    updates.push(
      supabase
        .from("quiz_responses")
        .update({
          wtp_score: wtp,
          is_super_lead: isSuper,
          wtp_reasons: rubric.signals.map((s) => ({ signal: s.questionId, detail: s.rationale })),
          wtp_scored_at: new Date().toISOString(),
        })
        .eq("id", responseId)
        .eq("organization_id", orgId)
    );
  }
  await Promise.all(updates);

  return NextResponse.json({
    rubric,
    applied: { scored, superLeads: supers, threshold },
  });
}
