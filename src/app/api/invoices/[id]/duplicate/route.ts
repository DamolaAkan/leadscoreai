import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateAdminSession, getAdminSessionFromRequest } from "@/lib/invoice-auth";
import { generateInvoiceNumber } from "@/lib/invoice-utils";

export const dynamic = "force-dynamic";

// Duplicate an invoice as a fresh DRAFT with a new number and a new date.
// Copies the client, line items, amounts, bank details and notes; never the
// status or paid/sent state. Defaults to today's date, preserving the original
// net terms (gap between issue and due); the UI can override either date.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const sessionId = getAdminSessionFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await validateAdminSession(sessionId);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: src, error: srcErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .single();
  if (srcErr || !src) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const DAY = 86_400_000;
  const today = new Date().toISOString().split("T")[0];
  const issueDate = (body.issue_date as string) || today;

  // Preserve the original net terms (due − issue), default 14 days.
  let termDays = 14;
  if (src.issue_date && src.due_date) {
    const d = Math.round((new Date(src.due_date).getTime() - new Date(src.issue_date).getTime()) / DAY);
    if (Number.isFinite(d) && d >= 0) termDays = d;
  }
  const dueDate =
    (body.due_date as string) ||
    new Date(new Date(issueDate).getTime() + termDays * DAY).toISOString().split("T")[0];

  const { data: lastInvoice } = await supabase
    .from("invoices")
    .select("invoice_number")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const invoiceNumber = generateInvoiceNumber(lastInvoice?.invoice_number ?? null);

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      client_id: src.client_id,
      invoice_number: invoiceNumber,
      issue_date: issueDate,
      due_date: dueDate,
      line_items: src.line_items,
      subtotal: src.subtotal,
      currency: src.currency,
      bank_details: src.bank_details,
      notes: src.notes,
      status: "draft",
    })
    .select("*, client:invoice_clients(*)")
    .single();

  if (error) {
    console.error("[invoices] duplicate error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ invoice: data }, { status: 201 });
}
