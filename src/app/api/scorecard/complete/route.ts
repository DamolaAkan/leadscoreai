import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { computeWtpIndex } from "@/lib/wtp";

// Finalizes a scorecard response (writes contact details + score). Runs with the
// service role so the public anon key never needs UPDATE/SELECT on the leads
// table. Public endpoint, but only finalizes a not-yet-completed response.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { responseId } = body;
    if (!responseId) {
      return NextResponse.json({ error: "responseId required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("quiz_responses")
      .select("id, completed_at, quiz_id, organization_id")
      .eq("id", responseId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }
    if (existing.completed_at) {
      return NextResponse.json({ ok: true, alreadyCompleted: true });
    }

    const { error } = await supabase
      .from("quiz_responses")
      .update({
        contact_name: body.contact_name ?? null,
        contact_email: body.contact_email ?? null,
        contact_phone: body.contact_phone ?? "",
        contact_company: body.contact_company ?? null,
        contact_website: body.contact_website ?? null,
        score: body.score ?? null,
        max_score: body.max_score ?? null,
        percentage: body.percentage ?? null,
        qualification: body.qualification ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", responseId);

    if (error) {
      console.error("[scorecard/complete] update error:", error.message);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    // Deterministic WTP index (Stage 1). Best-effort: never blocks completion.
    try {
      const [{ data: questions }, { data: answers }, { count: outcomeCount }] = await Promise.all([
        supabase
          .from("quiz_questions")
          .select("id, question_text, max_points, wtp_signal")
          .eq("quiz_id", existing.quiz_id),
        supabase
          .from("response_answers")
          .select("question_id, points_awarded")
          .eq("response_id", responseId),
        // Conversions in this vertical — the single outcome that graduates the
        // WTP score from index to calibrated.
        supabase
          .from("quiz_responses")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", existing.organization_id)
          .eq("converted_to_sale", true),
      ]);

      if (questions && answers) {
        const wtp = computeWtpIndex(questions, answers, outcomeCount || 0);
        await supabase
          .from("quiz_responses")
          .update({
            wtp_score: wtp.score,
            wtp_confidence: wtp.confidence,
            wtp_mode: wtp.mode,
            wtp_factors: wtp.factors,
            wtp_scored_at: new Date().toISOString(),
          })
          .eq("id", responseId);
      }
    } catch (wtpErr) {
      console.error("[scorecard/complete] WTP index error:", wtpErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[scorecard/complete] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
