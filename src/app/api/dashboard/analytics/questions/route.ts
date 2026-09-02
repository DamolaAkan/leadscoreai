import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";

// Per-question answer distributions ("Key Questions Analysis"). Fully dynamic:
// one breakdown per radio/matrix question in the org's scorecard(s), built from
// the questions' own options — no per-client code. Also the metadata source the
// Responses filter bar will consume later.

interface QuestionMeta {
  id: string;
  question_text: string;
  question_order: number;
  question_type: string;
  options: { text: string; value: number | string; points: number }[];
}

interface AnswerRow {
  question_id: string;
  answer_value: Record<string, unknown> | null;
}

export async function GET(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await validateSession(sessionId);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const orgId = user.organizationId;
  const { searchParams } = new URL(request.url);
  const quizId = searchParams.get("quizId") || "";

  // Categorical questions (radio/matrix) for this org's quizzes.
  let qQuery = supabase
    .from("quiz_questions")
    .select(
      "id, question_text, question_order, question_type, options, quizzes!inner(organization_id)"
    )
    .eq("quizzes.organization_id", orgId)
    .in("question_type", ["radio", "matrix"])
    .order("question_order", { ascending: true });
  if (quizId) qQuery = qQuery.eq("quiz_id", quizId);
  const { data: qData } = await qQuery;

  const questions = (qData || []) as unknown as QuestionMeta[];
  if (questions.length === 0) {
    return NextResponse.json({ questions: [] });
  }

  // Pull every answer for this org's completed responses (paged past the 1k cap).
  const PAGE = 1000;
  const answers: AnswerRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let aQuery = supabase
      .from("response_answers")
      .select(
        "question_id, answer_value, quiz_responses!inner(organization_id, completed_at, quiz_id)"
      )
      .eq("quiz_responses.organization_id", orgId)
      .not("quiz_responses.completed_at", "is", null);
    if (quizId) aQuery = aQuery.eq("quiz_responses.quiz_id", quizId);
    const { data, error } = await aQuery.range(from, from + PAGE - 1);
    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch answers" },
        { status: 500 }
      );
    }
    const batch = (data || []) as unknown as AnswerRow[];
    answers.push(...batch);
    if (batch.length < PAGE) break;
  }

  // Tally answers per question by their human-readable label.
  const tallies: Record<string, Record<string, number>> = {};
  for (const a of answers) {
    const label =
      a.answer_value && typeof a.answer_value.text === "string"
        ? (a.answer_value.text as string)
        : a.answer_value && a.answer_value.selected != null
        ? String(a.answer_value.selected)
        : null;
    if (!label) continue;
    (tallies[a.question_id] ||= {})[label] =
      (tallies[a.question_id]?.[label] || 0) + 1;
  }

  const breakdowns = questions
    .map((q) => {
      const counts = tallies[q.id] || {};
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      // Preserve the scorecard's own option order; append any stragglers.
      const ordered = q.options.map((o) => o.text);
      const labels = [
        ...ordered.filter((l) => counts[l] !== undefined),
        ...Object.keys(counts).filter((l) => !ordered.includes(l)),
      ];
      return {
        questionId: q.id,
        order: q.question_order,
        text: q.question_text,
        type: q.question_type,
        total,
        options: labels.map((label) => ({
          label,
          count: counts[label] || 0,
          pct: total > 0 ? Math.round((counts[label] || 0) / total * 100) : 0,
        })),
      };
    })
    .filter((b) => b.total > 0);

  return NextResponse.json({ questions: breakdowns });
}
