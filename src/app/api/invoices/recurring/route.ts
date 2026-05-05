import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateAdminSession, getAdminSessionFromRequest } from "@/lib/invoice-auth";

export async function GET(request: Request) {
  const sessionId = getAdminSessionFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await validateAdminSession(sessionId);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("recurring_invoices")
    .select("*, client:invoice_clients(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[invoices/recurring] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data });
}

export async function POST(request: Request) {
  const sessionId = getAdminSessionFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await validateAdminSession(sessionId);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { client_id, line_items, subtotal, currency, bank_details, notes, send_day } = body;

  if (!client_id || !line_items || !send_day) {
    return NextResponse.json({ error: "client_id, line_items, and send_day are required" }, { status: 400 });
  }

  if (send_day < 1 || send_day > 28) {
    return NextResponse.json({ error: "send_day must be between 1 and 28" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("recurring_invoices")
    .insert({
      client_id,
      line_items,
      subtotal: subtotal || 0,
      currency: currency || "USD",
      bank_details: bank_details || {},
      notes: notes || null,
      send_day,
    })
    .select("*, client:invoice_clients(*)")
    .single();

  if (error) {
    console.error("[invoices/recurring] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template: data }, { status: 201 });
}
