import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { decrypt } from "@/lib/encryption";
import { sendSequenceEmail } from "@/lib/email";

const ORG_ID = "7bdff093-478d-4ace-b282-123944232b2e";
const ADMIN_EMAIL = "akanbidamola@gmail.com";

export async function POST(request: Request) {
  try {
    const { responseId } = await request.json();

    if (!responseId) {
      return NextResponse.json(
        { error: "responseId required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get org features for Resend API key
    const { data: features } = await supabase
      .from("org_features")
      .select(
        "resend_api_key, resend_from_email, resend_from_name"
      )
      .eq("organization_id", ORG_ID)
      .single();

    // Use org key if available, otherwise fall back to env var
    const apiKey = features?.resend_api_key
      ? decrypt(features.resend_api_key)
      : process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.error("[salesnetwork] No Resend API key available");
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    const fromEmail = features?.resend_from_email || "support@practiceinteractions.com";
    const fromName = features?.resend_from_name || "The Sales Network";

    // Get the response data
    const { data: response, error: respError } = await supabase
      .from("quiz_responses")
      .select("*")
      .eq("id", responseId)
      .eq("organization_id", ORG_ID)
      .single();

    if (respError || !response) {
      return NextResponse.json(
        { error: "Response not found" },
        { status: 404 }
      );
    }

    if (!response.contact_email) {
      return NextResponse.json(
        { error: "No contact email on response" },
        { status: 400 }
      );
    }

    // Get the answers to find Q8 (podcast interest) and LinkedIn
    const { data: answers } = await supabase
      .from("response_answers")
      .select("question_order, answer_value")
      .eq("response_id", responseId)
      .order("question_order", { ascending: true });

    const q8Answer = answers?.find((a) => a.question_order === 8);
    const podcastInterest = q8Answer?.answer_value?.value || "Not answered";

    // Get LinkedIn from session — passed via request body
    // We'll pull it from the request instead
    const contactName = response.contact_name || "there";
    const contactEmail = response.contact_email;

    // --- 1. Send thank-you email to submitter ---
    const thankYouHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0A1628;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A1628;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#141C2B;border-radius:12px;overflow:hidden;">
<tr><td style="padding:32px 40px;text-align:center;border-bottom:1px solid rgba(201,147,58,0.25);">
<h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:700;font-family:Georgia,'Times New Roman',serif;letter-spacing:1px;">THE SALES NETWORK</h1>
</td></tr>
<tr><td style="padding:40px;">
<p style="margin:0 0 20px;font-size:16px;color:#FFFFFF;line-height:1.7;">Hi ${contactName},</p>
<p style="margin:0 0 20px;font-size:16px;color:#FFFFFF;line-height:1.7;">Thank you for sharing your story with The Sales Network.</p>
<p style="margin:0 0 20px;font-size:16px;color:#FFFFFF;line-height:1.7;">We review all submissions and will be in touch within 3 days if your feature is selected for publication. We will tag you on LinkedIn when it goes live.</p>
<p style="margin:0 0 20px;font-size:16px;color:#FFFFFF;line-height:1.7;">If you said yes to the podcast recording, Akanbi will be in touch shortly with a calendar link.</p>
<p style="margin:0 0 4px;font-size:16px;color:#FFFFFF;line-height:1.7;">The Sales Network</p>
<p style="margin:0;font-size:14px;color:#9CA3AF;line-height:1.7;">Powered by Practice Interactions &middot; <a href="https://practiceinteractions.com" style="color:#C9933A;text-decoration:none;">practiceinteractions.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    const { id: thankYouMessageId, error: thankYouError } =
      await sendSequenceEmail({
        to: contactEmail,
        subject: "Thank you for sharing your story — The Sales Network",
        html: thankYouHtml,
        apiKey,
        fromEmail,
        fromName,
      });

    console.log("[salesnetwork] Thank-you email result:", {
      to: contactEmail,
      messageId: thankYouMessageId,
      error: thankYouError,
    });

    // --- 2. Send notification email to Akanbi ---
    const notifyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f7f8;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
<tr><td style="background-color:#0A1628;padding:20px 40px;">
<h1 style="margin:0;color:#C9933A;font-size:18px;font-weight:700;">New Sales Network Submission</h1>
</td></tr>
<tr><td style="padding:32px 40px;">
<p style="margin:0 0 20px;font-size:16px;color:#1a1a1a;line-height:1.6;">New submission from The Sales Network form.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
<tr><td style="padding:12px 16px;background-color:#f9fafb;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;font-size:14px;width:140px;">Name</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#1a1a1a;font-size:14px;">${contactName}</td></tr>
<tr><td style="padding:12px 16px;background-color:#f9fafb;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;font-size:14px;">Email</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#1a1a1a;font-size:14px;"><a href="mailto:${contactEmail}" style="color:#0077B6;">${contactEmail}</a></td></tr>
<tr><td style="padding:12px 16px;background-color:#f9fafb;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;font-size:14px;">LinkedIn</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#1a1a1a;font-size:14px;">${response.agent_code || "Not provided"}</td></tr>
<tr><td style="padding:12px 16px;background-color:#f9fafb;font-weight:600;color:#374151;font-size:14px;">Podcast</td><td style="padding:12px 16px;color:#1a1a1a;font-size:14px;">${podcastInterest}</td></tr>
</table>
<p style="margin:0;font-size:14px;color:#6b7280;">View all submissions in the LeadScoreAI dashboard.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    const { id: notifyMessageId, error: notifyError } =
      await sendSequenceEmail({
        to: ADMIN_EMAIL,
        subject: `New Sales Network Submission — ${contactName}`,
        html: notifyHtml,
        apiKey,
        fromEmail,
        fromName,
      });

    console.log("[salesnetwork] Notification email result:", {
      to: ADMIN_EMAIL,
      messageId: notifyMessageId,
      error: notifyError,
    });

    return NextResponse.json({
      success: true,
      thankYou: { messageId: thankYouMessageId, error: thankYouError },
      notification: { messageId: notifyMessageId, error: notifyError },
    });
  } catch (err) {
    console.error("[salesnetwork] Email error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
