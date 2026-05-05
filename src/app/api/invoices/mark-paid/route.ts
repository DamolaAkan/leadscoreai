import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateAdminSession, getAdminSessionFromRequest } from "@/lib/invoice-auth";
import { sendSequenceEmail } from "@/lib/email";
import { buildReceiptEmailHtml } from "@/lib/invoice-email";
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
    return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });
  }

  // Update status to paid
  await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", invoice_id);

  // Get Resend API key from org_features (encrypted)
  const { data: features } = await supabase
    .from("org_features")
    .select("resend_api_key")
    .not("resend_api_key", "is", null)
    .limit(1)
    .single();

  const apiKey = features?.resend_api_key ? decrypt(features.resend_api_key) : null;

  // Send receipt email
  const client = invoice.client;
  const html = buildReceiptEmailHtml(invoice, client);
  const subject = `Payment Received — Invoice ${invoice.invoice_number} — Thank you`;

  let emailId: string | null = null;
  let sendError: string | null = null;

  if (apiKey) {
    const result = await sendSequenceEmail({
      to: client.email,
      subject,
      html,
      apiKey,
      fromEmail: "akanbidamola@practiceinteractions.com",
      fromName: "LeadscoreAI",
    });
    emailId = result.id;
    sendError = result.error;
  }

  if (sendError) {
    console.error("[invoices/mark-paid] Receipt email error:", sendError);
  }

  // Log the send
  await supabase
    .from("invoice_send_log")
    .insert({ invoice_id });

  console.log(`[invoices/mark-paid] Marked ${invoice.invoice_number} as paid, receipt sent to ${client.email}`);

  return NextResponse.json({ success: true, email_id: emailId || null });
}
