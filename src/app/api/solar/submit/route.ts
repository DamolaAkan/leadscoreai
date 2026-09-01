import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { computeWtpIndex } from "@/lib/wtp";

// Persists a Solar Fit submission (service role, so RLS/anon grants don't block
// the public funnel). One round trip: response + answers + best-effort WTP index.
const SOLAR_ORG_ID = "b2053990-51ee-4e98-ac7b-bbf4602655dc";
const SOLAR_QUIZ_ID = "b1a84145-562c-46f3-a2de-3309c3986532";
const QID: Record<number, string> = {
  1: "45d8b0d8-f9ae-4d8e-99da-da70f4ed3ebd",
  2: "6d7c0f03-cd00-4718-a468-fce63e2216f6",
  3: "059cec8e-11ae-42a8-9367-0ab88c16b6ba",
  4: "f1418899-3c67-47f7-a69d-a42ecc738e81",
  5: "144f7802-dd49-45a6-95be-160280aab59b",
  6: "0fda7d43-e1ba-4fbc-9cc5-6e38ed9d3409",
  7: "41f69e23-1d5b-4ac0-b8ee-fee35ef3a6b8",
};
const VALID_QUAL = new Set(["HOT_LEAD", "WARM_LEAD", "COLD_LEAD", "NOT_QUALIFIED"]);

interface InAnswer { order: number; text: string; points: number }

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const contact = body.contact || {};
    const answers: InAnswer[] = Array.isArray(body.answers) ? body.answers : [];
    const email = String(contact.email || "").trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const { allowed } = await checkRateLimit(request, "solar_submit", 40);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const score = Math.max(0, Math.min(100, Number(body.score) || 0));
    const qualification = VALID_QUAL.has(body.qualification) ? body.qualification : "NOT_QUALIFIED";

    const supabase = createServiceClient();
    const sessionId = `lsai-solar-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const { data: resp, error } = await supabase
      .from("quiz_responses")
      .insert({
        quiz_id: SOLAR_QUIZ_ID,
        organization_id: SOLAR_ORG_ID,
        session_id: sessionId,
        contact_name: String(contact.name || "").trim() || null,
        contact_email: email,
        contact_phone: String(contact.phone || "").trim() || null,
        contact_company: String(contact.co || "").trim() || null,
        score,
        max_score: 100,
        percentage: score,
        qualification,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !resp) {
      console.error("[solar/submit] insert error:", error?.message);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    const rows = answers
      .filter((a) => QID[a.order])
      .map((a) => ({
        response_id: resp.id,
        question_id: QID[a.order],
        question_order: a.order,
        answer_value: { value: String(a.text || "") },
        points_awarded: Number(a.points) || 0,
      }));
    if (rows.length) {
      const { error: aErr } = await supabase.from("response_answers").insert(rows);
      if (aErr) console.error("[solar/submit] answers error:", aErr.message);
    }

    // Best-effort deterministic WTP index — never blocks the response.
    try {
      const [{ data: questions }, { data: savedAnswers }] = await Promise.all([
        supabase
          .from("quiz_questions")
          .select("id, question_text, max_points, wtp_signal")
          .eq("quiz_id", SOLAR_QUIZ_ID),
        supabase
          .from("response_answers")
          .select("question_id, points_awarded")
          .eq("response_id", resp.id),
      ]);
      if (questions && savedAnswers) {
        const wtp = computeWtpIndex(questions, savedAnswers, 0);
        await supabase
          .from("quiz_responses")
          .update({
            wtp_score: wtp.score,
            wtp_confidence: wtp.confidence,
            wtp_mode: wtp.mode,
            wtp_factors: wtp.factors,
            wtp_scored_at: new Date().toISOString(),
          })
          .eq("id", resp.id);
      }
    } catch (wtpErr) {
      console.error("[solar/submit] WTP error:", wtpErr);
    }

    return NextResponse.json({ responseId: resp.id });
  } catch (err) {
    console.error("[solar/submit] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
