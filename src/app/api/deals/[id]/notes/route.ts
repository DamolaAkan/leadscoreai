import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin, canManage, AdminUser } from "@/lib/invoice-auth";

export const dynamic = "force-dynamic";

// Confirm the user may touch this deal (reps: own only; managers: any).
async function guard(id: string, user: AdminUser) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("sl_deals")
    .select("id, owner_id")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (!data) return { ok: false, status: 404 as const };
  if (!canManage(user) && data.owner_id !== user.id) return { ok: false, status: 403 as const };
  return { ok: true, status: 200 as const };
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const g = await guard(params.id, user);
  if (!g.ok) return NextResponse.json({ error: g.status === 404 ? "Not found" : "Forbidden" }, { status: g.status });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sl_deal_notes")
    .select("id, body, created_at, author:admin_users(id, full_name)")
    .eq("deal_id", params.id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data || [] });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const g = await guard(params.id, user);
  if (!g.ok) return NextResponse.json({ error: g.status === 404 ? "Not found" : "Forbidden" }, { status: g.status });

  const body = await request.json().catch(() => ({}));
  const text = (body.body || "").trim();
  if (!text) return NextResponse.json({ error: "Note cannot be empty" }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sl_deal_notes")
    .insert({ deal_id: params.id, author_id: user.id, body: text })
    .select("id, body, created_at, author:admin_users(id, full_name)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}
