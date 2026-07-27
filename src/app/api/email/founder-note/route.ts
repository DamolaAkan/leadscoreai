import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { decrypt } from "@/lib/encryption";
import { sendSequenceEmail } from "@/lib/email";
import { buildFounderEmail } from "@/lib/loandoctor-founder-email";

// Founder note from Damola, sent once after someone completes the Loan Doctor
// check-up. Self-gates to the loandoctor org, so it is harmless to call for any
// completion. Best-effort: never blocks the respondent's results screen.
export async function POST(request: Request) {
  try {
    const { responseId, organizationId } = await request.json();
    if (!responseId || !organizationId) {
      return NextResponse.json({ error: "responseId and organizationId required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Only the Loan Doctor scorecard sends the founder note.
    const { data: org } = await supabase
      .from("organizations")
      .select("slug")
      .eq("id", organizationId)
      .single();
    if (org?.slug !== "loandoctor") {
      return NextResponse.json({ skipped: true, reason: "not loandoctor" });
    }

    const { data: response } = await supabase
      .from("quiz_responses")
      .select("contact_name, contact_email, contact_phone, percentage, qualification, founder_email_sent_at")
      .eq("id", responseId)
      .eq("organization_id", organizationId)
      .single();

    if (!response?.contact_email) {
      return NextResponse.json({ skipped: true, reason: "no email" });
    }
    if (response.founder_email_sent_at) {
      return NextResponse.json({ skipped: true, reason: "already sent" });
    }

    // Reuse the leadscoreai.com-verified Resend key stored (encrypted) in
    // org_features — the same one deal notifications use.
    const { data: features } = await supabase
      .from("org_features")
      .select("resend_api_key")
      .not("resend_api_key", "is", null)
      .limit(1)
      .single();
    if (!features?.resend_api_key) {
      return NextResponse.json({ skipped: true, reason: "no resend key" });
    }
    const apiKey = decrypt(features.resend_api_key);

    const firstName = (response.contact_name || "there").split(" ")[0];

    // Internal heads-up to the team so no one has to watch the dashboard.
    const pct = response.percentage || 0;
    const tier =
      pct >= 80 ? "Healthy" : pct >= 60 ? "Fair" : pct >= 40 ? "Needs work" : "At risk";
    const teamHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f6f4fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4fb;"><tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;border:1px solid #ece7f6;">
      <tr><td style="padding:32px 36px;">
        <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#6d28d9;">🎉 New lead from the MFB Scorecard</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#15131c;">Congratulations — a new lead just came through.</h1>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;">
          <tr><td style="padding:18px 20px;font-size:15px;color:#1e293b;line-height:1.9;">
            <strong>Name:</strong> ${response.contact_name || "—"}<br>
            <strong>Email:</strong> ${response.contact_email}<br>
            <strong>Phone:</strong> ${response.contact_phone || "—"}<br>
            <strong>Loan book health:</strong> ${pct}% — ${tier}
          </td></tr>
        </table>
        <div style="margin:24px 0 4px;">
          <a href="https://app.leadscoreai.com/dashboard/loandoctor" style="display:inline-block;background:#6d28d9;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:8px;">Open the dashboard &rarr;</a>
        </div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

    await sendSequenceEmail({
      to: "akanbi@leadscoreai.com",
      subject: `🎉 New lead from MFB Scorecard — ${response.contact_name || firstName}`,
      html: teamHtml,
      apiKey,
      fromEmail: "notifications@leadscoreai.com",
      fromName: "LeadScoreAI",
    });

    const { subject, html } = buildFounderEmail({
      firstName,
      percentage: response.percentage || 0,
    });

    const { id: messageId, error: sendError } = await sendSequenceEmail({
      to: response.contact_email,
      subject,
      html,
      apiKey,
      fromEmail: "akanbi@leadscoreai.com",
      fromName: "Damola from LeadScoreAI",
    });

    if (sendError) {
      console.error("[founder-note] send error:", sendError);
      return NextResponse.json({ success: false, error: sendError });
    }

    await supabase
      .from("quiz_responses")
      .update({ founder_email_sent_at: new Date().toISOString() })
      .eq("id", responseId);

    console.log(`[founder-note] sent to ${response.contact_email} (resend_id: ${messageId})`);
    return NextResponse.json({ success: true, messageId });
  } catch (err) {
    console.error("[founder-note] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
