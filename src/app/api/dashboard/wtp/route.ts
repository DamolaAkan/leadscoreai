import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";
import { isClaudeConfigured } from "@/lib/claude";

// Fetch the latest stored WTP rubric + super-lead stats — no agent call. The
// Predictive Insights tab loads this; the POST /wtp/generate action re-runs the
// agent and rewrites it.

interface Signal {
  questionId: string;
  rationale: string;
  weights: { value: number; label: string; weight: number }[];
}

export async function GET(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await validateSession(sessionId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const orgId = user.organizationId;

  const { data: latest } = await supabase
    .from("wtp_rubrics")
    .select("rubric, summary, suggested_questions, super_lead_threshold, model, generated_at")
    .eq("organization_id", orgId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Super-lead + WTP stats across scored leads.
  const [{ count: superCount }, { count: scoredCount }, { data: topRows }] =
    await Promise.all([
      supabase
        .from("quiz_responses")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("is_super_lead", true),
      supabase
        .from("quiz_responses")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .not("wtp_score", "is", null),
      supabase
        .from("quiz_responses")
        .select("contact_name, qualification, wtp_score, converted_to_sale")
        .eq("organization_id", orgId)
        .eq("is_super_lead", true)
        .order("wtp_score", { ascending: false })
        .limit(5),
    ]);

  let signals: (Signal & { questionText: string })[] = [];
  if (latest?.rubric) {
    const rubricSignals = latest.rubric as Signal[];
    const ids = rubricSignals.map((s) => s.questionId);
    const { data: qs } = await supabase
      .from("quiz_questions")
      .select("id, question_text")
      .in("id", ids);
    const textById: Record<string, string> = {};
    (qs || []).forEach((q) => (textById[q.id] = q.question_text));
    signals = rubricSignals.map((s) => ({ ...s, questionText: textById[s.questionId] || "" }));
  }

  return NextResponse.json({
    configured: isClaudeConfigured(),
    hasRubric: !!latest,
    generatedAt: latest?.generated_at || null,
    model: latest?.model || null,
    summary: latest?.summary || null,
    threshold: latest?.super_lead_threshold ?? null,
    suggestedQuestions: latest?.suggested_questions || [],
    signals,
    stats: {
      superLeads: superCount || 0,
      scored: scoredCount || 0,
      topSuperLeads: topRows || [],
    },
  });
}
