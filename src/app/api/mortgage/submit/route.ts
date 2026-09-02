import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { computeWtpIndex } from "@/lib/wtp";
import { sendMetaLead, clientSignals } from "@/lib/meta-capi";

// Persists a Mortgage Fit submission (service role, so RLS/anon grants don't
// block the public funnel). One round trip: response + answers + WTP index.
const MORTGAGE_ORG_ID = "b2053990-51ee-4e98-ac7b-bbf4602655dc";
const MORTGAGE_QUIZ_ID = "06b88e2d-429a-4e4f-b844-1eb06714191b";
const QID: Record<number, string> = {
  1: "3cdc4ff5-edb4-44ad-bb20-58cd3f01ce9d",
  2: "a5ac0789-b068-4587-86d3-42aace5b34c3",
  3: "2ac7dd28-e2b1-4d3c-a3f2-70043ce9c303",
  4: "dd08e6bf-8074-48a1-a87b-217b9eb0851f",
  5: "e28255c5-6d5a-4fd5-b843-6ff612b25826",
  6: "d61bd572-2b6a-4ae2-80eb-b795fe3b53eb",
  7: "358431fc-d4ad-4073-bbe9-56368eb68554",
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

    const { allowed } = await checkRateLimit(request, "mortgage_submit", 40);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const score = Math.max(0, Math.min(100, Number(body.score) || 0));
    const qualification = VALID_QUAL.has(body.qualification) ? body.qualification : "NOT_QUALIFIED";

    const supabase = createServiceClient();
    const sessionId = `lsai-mortgage-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const { data: resp, error } = await supabase
      .from("quiz_responses")
      .insert({
        quiz_id: MORTGAGE_QUIZ_ID,
        organization_id: MORTGAGE_ORG_ID,
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
      console.error("[mortgage/submit] insert error:", error?.message);
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
      if (aErr) console.error("[mortgage/submit] answers error:", aErr.message);
    }

    // Best-effort deterministic WTP index — never blocks the response.
    try {
      const [{ data: questions }, { data: savedAnswers }] = await Promise.all([
        supabase
          .from("quiz_questions")
          .select("id, question_text, max_points, wtp_signal")
          .eq("quiz_id", MORTGAGE_QUIZ_ID),
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
      console.error("[mortgage/submit] WTP error:", wtpErr);
    }

    // Conversions API Lead (server-side) — de-dupes with the browser pixel via
    // the shared event_id (resp.id). Awaited; never throws.
    const sig = clientSignals(request);
    await sendMetaLead({
      eventId: resp.id,
      email,
      phone: String(contact.phone || "").trim(),
      name: String(contact.name || "").trim(),
      funnel: "mortgage",
      eventSourceUrl: sig.eventSourceUrl || "https://app.leadscoreai.com/mortgage",
      clientIp: sig.clientIp,
      userAgent: sig.userAgent,
    });

    return NextResponse.json({ responseId: resp.id });
  } catch (err) {
    console.error("[mortgage/submit] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
