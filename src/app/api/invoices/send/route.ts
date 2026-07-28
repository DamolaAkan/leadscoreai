import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateAdminSession, getAdminSessionFromRequest } from "@/lib/invoice-auth";
import { sendSequenceEmail } from "@/lib/email";
import { buildInvoiceEmailHtml } from "@/lib/invoice-email";
import { formatDate } from "@/lib/invoice-utils";
import { decrypt } from "@/lib/encryption";

export async function POST(request: Request) {
  const sessionId = getAdminSessionFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await validateAdminSession(sessionId);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { invoice_id } = await request.json();
  if (!invoice_id) {
    return NextResponse.json({ error: "invoice_id is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch invoice with client
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*, client:invoice_clients(*)")
    .eq("id", invoice_id)
    .single();

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "paid") {
    return NextResponse.json({ error: "Cannot send a paid invoice" }, { status: 400 });
  }

  const client = invoice.client;
  const html = buildInvoiceEmailHtml(invoice, client);
  const subject = `Invoice ${invoice.invoice_number} from LeadscoreAI — Due ${formatDate(invoice.due_date)}`;

  // Get Resend API key from org_features (encrypted)
  const { data: features } = await supabase
    .from("org_features")
    .select("resend_api_key")
    .not("resend_api_key", "is", null)
    .limit(1)
    .single();

  if (!features?.resend_api_key) {
    return NextResponse.json({ error: "No Resend API key configured" }, { status: 500 });
  }

  const apiKey = decrypt(features.resend_api_key);

  const { id: emailId, error: sendError } = await sendSequenceEmail({
    to: client.email,
    subject,
    html,
    apiKey,
    fromEmail: "billing@leadscoreai.com",
    fromName: "LeadScoreAI",
  });

  if (sendError) {
    console.error("[invoices/send] Email error:", sendError);
    return NextResponse.json({ error: `Failed to send email: ${sendError}` }, { status: 500 });
  }

  // Update invoice status
  await supabase
    .from("invoices")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", invoice_id);

  // Log the send
  await supabase
    .from("invoice_send_log")
    .insert({ invoice_id });

  console.log(`[invoices/send] Sent ${invoice.invoice_number} to ${client.email} (resend_id: ${emailId})`);

  return NextResponse.json({ success: true, email_id: emailId });
}
