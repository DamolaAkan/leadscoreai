import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateAdminSession, getAdminSessionFromRequest } from "@/lib/invoice-auth";
import { sendSequenceEmail } from "@/lib/email";
import { buildLineItemReceiptEmailHtml } from "@/lib/invoice-email";
import { generateReceiptNumber, calculateBalanceDue } from "@/lib/invoice-utils";
import { generateReceiptPdf } from "@/lib/invoice-pdf";
import { decrypt } from "@/lib/encryption";
import { InvoiceLineItem } from "@/lib/invoice-types";

export async function POST(request: Request) {
  const sessionId = getAdminSessionFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await validateAdminSession(sessionId);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { invoice_id, line_item_index } = await request.json();
  if (!invoice_id || line_item_index === undefined) {
    return NextResponse.json({ error: "invoice_id and line_item_index are required" }, { status: 400 });
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

  const lineItems: InvoiceLineItem[] = invoice.line_items;

  if (line_item_index < 0 || line_item_index >= lineItems.length) {
    return NextResponse.json({ error: "Invalid line item index" }, { status: 400 });
  }

  const item = lineItems[line_item_index];
  if (item.type === "payment") {
    return NextResponse.json({ error: "Cannot mark a payment item as paid" }, { status: 400 });
  }

  if (item.paid) {
    return NextResponse.json({ error: "Line item is already paid" }, { status: 400 });
  }

  // Update the line item
  const now = new Date().toISOString();
  lineItems[line_item_index] = {
    ...item,
    paid: true,
    paid_date: now,
  };

  // Check if all charge items are now paid
  const allChargesPaid = lineItems
    .filter((li) => !li.type || li.type === "charge")
    .every((li) => li.paid);

  // Update invoice
  const updateData: Record<string, unknown> = { line_items: lineItems };
  if (allChargesPaid) {
    updateData.status = "paid";
    updateData.paid_at = now;
  }

  await supabase
    .from("invoices")
    .update(updateData)
    .eq("id", invoice_id);

  // Generate receipt number
  const receiptNumber = generateReceiptNumber(invoice.invoice_number, line_item_index);

  // Update the invoice object for email/PDF generation (reflect new paid states)
  const updatedInvoice = { ...invoice, line_items: lineItems };
  if (allChargesPaid) {
    updatedInvoice.status = "paid";
    updatedInvoice.paid_at = now;
  }

  const client = invoice.client;
  const balanceDue = calculateBalanceDue(lineItems);

  // Generate receipt PDF
  const pdfBuffer = generateReceiptPdf({
    receiptNumber,
    invoiceNumber: invoice.invoice_number,
    clientName: client.name,
    clientCompany: client.company,
    description: item.description,
    amount: item.amount,
    currency: invoice.currency,
    date: now,
    runningBalance: balanceDue,
  });

  // Build receipt email
  const html = buildLineItemReceiptEmailHtml(updatedInvoice, client, line_item_index, receiptNumber);
  const subject = `Payment Receipt ${receiptNumber} — Invoice ${invoice.invoice_number}`;

  // Get Resend API key
  const { data: features } = await supabase
    .from("org_features")
    .select("resend_api_key")
    .not("resend_api_key", "is", null)
    .limit(1)
    .single();

  const apiKey = features?.resend_api_key ? decrypt(features.resend_api_key) : null;

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
      attachments: [
        {
          filename: `${receiptNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
    emailId = result.id;
    sendError = result.error;
  }

  if (sendError) {
    console.error("[invoices/mark-line-item-paid] Receipt email error:", sendError);
  }

  // Log the send
  await supabase
    .from("invoice_send_log")
    .insert({ invoice_id });

  console.log(
    `[invoices/mark-line-item-paid] Marked item ${line_item_index} paid on ${invoice.invoice_number}, receipt ${receiptNumber} sent to ${client.email}`
  );

  return NextResponse.json({
    success: true,
    receipt_number: receiptNumber,
    all_paid: allChargesPaid,
    email_id: emailId || null,
  });
}
