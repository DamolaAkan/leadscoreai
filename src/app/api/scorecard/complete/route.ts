import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { computeWtpIndex } from "@/lib/wtp";
import { decrypt } from "@/lib/encryption";
import { sendSequenceEmail } from "@/lib/email";

// The internal LeadScoreAI /solar funnel org has its own team notification
// (solar-notify), so skip the per-client hot-lead email for it.
const INTERNAL_SOLAR_ORG = "b2053990-51ee-4e98-ac7b-bbf4602655dc";

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

    // Notify the business by email when a HOT lead comes in (best-effort — never
    // blocks completion). Hot-only keeps volume + inbox noise down.
    try {
      if (body.qualification === "HOT_LEAD" && existing.organization_id !== INTERNAL_SOLAR_ORG) {
        const { data: org } = await supabase
          .from("organizations")
          .select("name, slug, email")
          .eq("id", existing.organization_id)
          .single();
        const to = (org?.email || "").trim();
        if (org && to && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
          const { data: features } = await supabase
            .from("org_features")
            .select("resend_api_key")
            .not("resend_api_key", "is", null)
            .limit(1)
            .single();
          const apiKey = features?.resend_api_key ? decrypt(features.resend_api_key) : process.env.RESEND_API_KEY;
          if (apiKey) {
            const origin = new URL(request.url).origin;
            const dash = `${origin}/dashboard/${org.slug}`;
            const name = body.contact_name || "New lead";
            const phone = body.contact_phone || "—";
            const email = body.contact_email || "—";
            const pct = body.percentage ?? Math.round(((body.score ?? 0) / (body.max_score || 100)) * 100);
            const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2533;">
  <div style="background:#dc2626;border-radius:12px;padding:16px 20px;color:#fff;">
    <div style="font-size:18px;font-weight:700;">🔥 New hot lead for ${org.name}</div>
    <div style="font-size:13px;opacity:.9;margin-top:2px;">Score ${pct}% — ready and able to buy. Best to call them soon.</div>
  </div>
  <div style="padding:16px 4px;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="color:#667085;padding:6px 0;">Name</td><td style="text-align:right;font-weight:600;">${name}</td></tr>
      <tr><td style="color:#667085;padding:6px 0;">Phone</td><td style="text-align:right;"><a href="tel:${phone}" style="color:#6d28d9;text-decoration:none;">${phone}</a></td></tr>
      <tr><td style="color:#667085;padding:6px 0;">Email</td><td style="text-align:right;">${email}</td></tr>
      <tr><td style="color:#667085;padding:6px 0;">Score</td><td style="text-align:right;">${pct}% · Hot Lead</td></tr>
    </table>
    <a href="${dash}" style="display:inline-block;margin-top:14px;background:#6d28d9;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600;">View in your dashboard →</a>
  </div>
</div>`;
            await sendSequenceEmail({
              to,
              subject: `🔥 New hot lead: ${name} (${pct}%)`,
              html,
              apiKey,
              fromEmail: "hello@leadscoreai.com",
              fromName: "LeadScoreAI",
            });
          }
        }
      }
    } catch (notifyErr) {
      console.error("[scorecard/complete] hot-lead notify error:", notifyErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[scorecard/complete] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
