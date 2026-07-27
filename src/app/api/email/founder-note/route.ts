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
      .select("contact_name, contact_email, percentage, founder_email_sent_at")
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
