import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateAdminSession, getAdminSessionFromRequest } from "@/lib/invoice-auth";
import { generateInvoiceNumber } from "@/lib/invoice-utils";

export async function GET(request: Request) {
  const sessionId = getAdminSessionFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await validateAdminSession(sessionId);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const supabase = createServiceClient();
  let query = supabase
    .from("invoices")
    .select("*, client:invoice_clients(*)")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[invoices] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invoices: data });
}

export async function POST(request: Request) {
  const sessionId = getAdminSessionFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await validateAdminSession(sessionId);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { client_id, due_date, line_items, subtotal, currency, bank_details, notes, issue_date } = body;

  if (!client_id || !due_date || !line_items || line_items.length === 0) {
    return NextResponse.json({ error: "client_id, due_date, and line_items are required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get last invoice number
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
      client_id,
      invoice_number: invoiceNumber,
      issue_date: issue_date || new Date().toISOString().split("T")[0],
      due_date,
      line_items,
      subtotal: subtotal || 0,
      currency: currency || "USD",
      bank_details: bank_details || {},
      notes: notes || null,
      status: "draft",
    })
    .select("*, client:invoice_clients(*)")
    .single();

  if (error) {
    console.error("[invoices] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invoice: data }, { status: 201 });
}
