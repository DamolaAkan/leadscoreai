import { createServiceClient } from "./supabase";
import { sendSequenceEmail } from "./email";
import { decrypt } from "./encryption";
import { formatMoney } from "./sl-format";
import { SlCurrency } from "./sl-types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.leadscoreai.com";

interface DealAssignedInput {
  ownerEmail: string;
  ownerName: string;
  assignerName: string;
  deal: {
    id: string;
    contact_name: string;
    company_name: string | null;
    setup_fee: number;
    currency: SlCurrency;
  };
}

// Email a rep when a new deal is assigned to them. Best-effort: never throws,
// so it can never block deal creation. Reuses the Resend key stored (encrypted)
// in org_features, the same one invoicing uses.
export async function notifyDealAssigned(input: DealAssignedInput): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { data: features } = await supabase
      .from("org_features")
      .select("resend_api_key")
      .not("resend_api_key", "is", null)
      .limit(1)
      .single();
    if (!features?.resend_api_key) return;
    const apiKey = decrypt(features.resend_api_key);

    const dealUrl = `${APP_URL}/deals/${input.deal.id}`;
    const company = input.deal.company_name ? ` at ${input.deal.company_name}` : "";
    const fee = input.deal.setup_fee > 0 ? formatMoney(input.deal.setup_fee, input.deal.currency) : "To be agreed";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Inter',system-ui,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;">
        <tr><td style="padding:28px 36px 16px;">
          <h1 style="margin:0;font-size:22px;font-weight:800;color:#15131c;letter-spacing:-0.5px;">LeadScore<span style="color:#7C3AED;">AI</span></h1>
        </td></tr>
        <tr><td style="padding:0 36px 32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Hi ${input.ownerName},</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">
            ${input.assignerName} assigned a new deal to you.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:10px;">
            <tr><td style="padding:18px 20px;">
              <p style="margin:0 0 6px;font-size:17px;font-weight:700;color:#1e293b;">${input.deal.contact_name}${company}</p>
              <p style="margin:0;font-size:14px;color:#64748b;">Setup fee: <strong style="color:#1e293b;">${fee}</strong></p>
            </td></tr>
          </table>
          <div style="margin:24px 0 8px;">
            <a href="${dealUrl}" style="display:inline-block;background-color:#7C3AED;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:8px;">View deal</a>
          </div>
          <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;">Open your workspace at <a href="${APP_URL}/deals" style="color:#7C3AED;">app.leadscoreai.com</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const { id, error } = await sendSequenceEmail({
      to: input.ownerEmail,
      subject: `New deal assigned: ${input.deal.contact_name}`,
      html,
      apiKey,
      fromEmail: "akanbidamola@practiceinteractions.com",
      fromName: "LeadScoreAI",
    });
    if (error) console.error("[sl-notify] deal assignment email error:", error);
    else console.log(`[sl-notify] deal assignment email sent to ${input.ownerEmail} (resend_id: ${id})`);
  } catch (e) {
    console.error("[sl-notify] deal assignment email failed:", e);
  }
}
