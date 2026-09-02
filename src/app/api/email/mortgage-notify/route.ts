import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { decrypt } from "@/lib/encryption";
import { sendSequenceEmail } from "@/lib/email";

// Notifies the team of a new Mortgage Fit lead and sends the lead a thank-you.
const ORG_ID = "b2053990-51ee-4e98-ac7b-bbf4602655dc";
// Stella handles all follow-ups; Akanbi is copied. Both get the lead alert.
const TEAM_EMAILS = ["akanbi@leadscoreai.com", "stella@leadscoreai.com"];
const STELLA_EMAIL = "stella@leadscoreai.com";

const LABELS: Record<number, string> = {
  1: "Mortgage enquiries / month",
  2: "Become buyers",
  3: "Mainly sells",
  4: "Average price",
  5: "How buyers pay",
  6: "How soon",
  7: "Commit ₦130k/mo",
};

export async function POST(request: Request) {
  try {
    const { responseId } = await request.json();
    if (!responseId) {
      return NextResponse.json({ error: "responseId required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Same stored LeadScoreAI Resend key the invoices send with (leadscoreai.com
    // is verified on that account). Env key is a last resort only.
    const { data: features } = await supabase
      .from("org_features")
      .select("resend_api_key")
      .not("resend_api_key", "is", null)
      .limit(1)
      .single();

    const apiKey = features?.resend_api_key
      ? decrypt(features.resend_api_key)
      : process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.error("[mortgage-notify] No Resend API key available");
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const fromEmail = "hello@leadscoreai.com";
    const fromName = "LeadScoreAI";

    const { data: response, error: respError } = await supabase
      .from("quiz_responses")
      .select("*")
      .eq("id", responseId)
      .eq("organization_id", ORG_ID)
      .single();

    if (respError || !response) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    const { data: answers } = await supabase
      .from("response_answers")
      .select("question_order, answer_value")
      .eq("response_id", responseId)
      .order("question_order", { ascending: true });

    const contactName = response.contact_name || "there";
    const contactEmail = response.contact_email as string | null;
    const score = response.score ?? 0;
    const qualified = response.qualification && response.qualification !== "NOT_QUALIFIED";

    const answerRows = (answers || [])
      .map((a) => {
        const val = (a.answer_value as { value?: string })?.value ?? "";
        return `<tr><td style="padding:9px 14px;background:#f6f8f5;border-bottom:1px solid #eee;font-weight:600;color:#374151;font-size:13px;width:190px;">${LABELS[a.question_order] || `Q${a.question_order}`}</td><td style="padding:9px 14px;border-bottom:1px solid #eee;color:#1a1a1a;font-size:13px;">${val || "—"}</td></tr>`;
      })
      .join("");

    // --- 1. Team alert ---
    const notifyHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f8;"><tr><td align="center" style="padding:36px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(120deg,#0f3d2e,#14664c);padding:20px 32px;">
<h1 style="margin:0;color:#fff;font-size:18px;font-weight:800;">🔑 New Mortgage Fit lead — ${score}/100 · ${qualified ? "QUALIFIED" : "not qualified"}</h1></td></tr>
<tr><td style="padding:28px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
<tr><td style="padding:9px 14px;background:#f6f8f5;border-bottom:1px solid #eee;font-weight:600;color:#374151;font-size:13px;width:190px;">Name</td><td style="padding:9px 14px;border-bottom:1px solid #eee;color:#1a1a1a;font-size:13px;">${contactName}</td></tr>
<tr><td style="padding:9px 14px;background:#f6f8f5;border-bottom:1px solid #eee;font-weight:600;color:#374151;font-size:13px;">Company</td><td style="padding:9px 14px;border-bottom:1px solid #eee;color:#1a1a1a;font-size:13px;">${response.contact_company || "—"}</td></tr>
<tr><td style="padding:9px 14px;background:#f6f8f5;border-bottom:1px solid #eee;font-weight:600;color:#374151;font-size:13px;">Email</td><td style="padding:9px 14px;border-bottom:1px solid #eee;color:#1a1a1a;font-size:13px;"><a href="mailto:${contactEmail}" style="color:#0f6a4a;">${contactEmail}</a></td></tr>
<tr><td style="padding:9px 14px;background:#f6f8f5;border-bottom:1px solid #eee;font-weight:600;color:#374151;font-size:13px;">Phone</td><td style="padding:9px 14px;border-bottom:1px solid #eee;color:#1a1a1a;font-size:13px;">${response.contact_phone || "—"}</td></tr>
${answerRows}
</table>
<p style="margin:0;font-size:13px;color:#6b7280;">Score ${score}/100 · ${response.qualification}. View all Mortgage leads in the LeadScoreAI dashboard.</p>
</td></tr></table></td></tr></table></body></html>`;

    const { error: notifyError } = await sendSequenceEmail({
      to: TEAM_EMAILS,
      subject: `Mortgage Fit lead — ${contactName} · ${score}/100 ${qualified ? "(qualified)" : ""}`,
      html: notifyHtml,
      apiKey,
      fromEmail,
      fromName,
      // Reply goes straight to the lead so Stella can follow up in one click.
      replyTo: contactEmail || undefined,
    });

    // --- 2. Lead thank-you ---
    let leadError: unknown = null;
    if (contactEmail) {
      const body = qualified
        ? `<p style="margin:0 0 16px;font-size:15px;color:#15231c;line-height:1.6;">Good news — from your answers, LeadScoreAI is a strong fit for your business.</p>
<p style="margin:0 0 16px;font-size:15px;color:#15231c;line-height:1.6;">A LeadScoreAI rep will reach out shortly to set up your branded mortgage scorecard and dashboard — free to start. You bring your own enquiries; after that it's ₦130,000/month to keep it running, and you can cancel anytime.</p>
<p style="margin:0 0 16px;font-size:15px;color:#15231c;line-height:1.6;">Talk soon.</p>`
        : `<p style="margin:0 0 16px;font-size:15px;color:#15231c;line-height:1.6;">Thanks for taking the Mortgage Fit assessment. From your answers, the free scorecard wouldn't do much for you just yet — so we won't rush you.</p>
<p style="margin:0 0 16px;font-size:15px;color:#15231c;line-height:1.6;">We'll keep you posted and reach out when the timing makes more sense. In the meantime, if anything changes, just reply to this email.</p>`;
      const leadHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f2eee4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2eee4;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e6e1d6;">
<tr><td style="background:linear-gradient(120deg,#0f3d2e,#14664c);padding:26px 40px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">🔑 Your Mortgage Fit score: ${score}/100</h1></td></tr>
<tr><td style="padding:34px 40px;">
<p style="margin:0 0 16px;font-size:15px;color:#15231c;line-height:1.6;">Hi ${contactName},</p>
${body}
<p style="margin:24px 0 0;font-size:13px;color:#8b968d;line-height:1.6;">LeadScoreAI — know which buyers can actually finance before you chase them.</p>
</td></tr></table></td></tr></table></body></html>`;
      const res = await sendSequenceEmail({
        to: contactEmail,
        subject: qualified ? "Your free mortgage scorecard — next steps" : "Your Mortgage Fit results",
        html: leadHtml,
        apiKey,
        fromEmail,
        fromName,
        // Lead replies land with Stella, who handles all follow-ups.
        replyTo: STELLA_EMAIL,
      });
      leadError = res.error;
    }

    return NextResponse.json({ success: true, notify: { error: notifyError }, lead: { error: leadError } });
  } catch (err) {
    console.error("[mortgage-notify] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
