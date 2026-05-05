import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateAdminSession, getAdminSessionFromRequest } from "@/lib/invoice-auth";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const sessionId = getAdminSessionFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await validateAdminSession(sessionId);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("invoice_clients")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ client: data });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const sessionId = getAdminSessionFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await validateAdminSession(sessionId);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("invoice_clients")
    .update(body)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    console.error("[invoices/clients] PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ client: data });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const sessionId = getAdminSessionFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await validateAdminSession(sessionId);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("invoice_clients")
    .delete()
    .eq("id", params.id);

  if (error) {
    console.error("[invoices/clients] DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
