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
    .from("invoice_clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[invoices/clients] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clients: data });
}

export async function POST(request: Request) {
  const sessionId = getAdminSessionFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await validateAdminSession(sessionId);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, company, email, currency, notes } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("invoice_clients")
    .insert({ name, company: company || null, email, currency: currency || "USD", notes: notes || null })
    .select()
    .single();

  if (error) {
    console.error("[invoices/clients] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ client: data }, { status: 201 });
}
