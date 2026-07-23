import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin, canManage, AdminUser } from "@/lib/invoice-auth";

export const dynamic = "force-dynamic";

const DEAL_SELECT =
  "*, product:sl_products(id,name,slug,is_commission_eligible,commission_rate), owner:admin_users!sl_deals_owner_id_fkey(id,full_name)";

// Load a deal and enforce that the user is allowed to see it.
async function loadDeal(id: string, user: AdminUser) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sl_deals")
    .select(DEAL_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error || !data) return { deal: null, forbidden: false };
  if (!canManage(user) && data.owner_id !== user.id) {
    return { deal: null, forbidden: true };
  }
  return { deal: data, forbidden: false };
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { deal, forbidden } = await loadDeal(params.id, user);
  if (forbidden) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Attach the commission (if the paid deal earned one) so the detail page can show it.
  const supabase = createServiceClient();
  const { data: commission } = await supabase
    .from("sl_commissions")
    .select("*")
    .eq("deal_id", params.id)
    .maybeSingle();

  return NextResponse.json({ deal, commission: commission || null });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { deal, forbidden } = await loadDeal(params.id, user);
  if (forbidden) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const fields = [
    "contact_name",
    "contact_email",
    "contact_phone",
    "company_name",
    "product_id",
    "notes",
  ];
  for (const f of fields) {
    if (f in body) patch[f] = typeof body[f] === "string" ? body[f].trim() || null : body[f];
  }
  if ("currency" in body) patch.currency = body.currency === "USD" ? "USD" : "NGN";
  if ("setup_fee" in body) patch.setup_fee = Number(body.setup_fee) || 0;
  if ("monthly_amount" in body) patch.monthly_amount = Number(body.monthly_amount) || 0;
  if (patch.contact_name === null) {
    return NextResponse.json({ error: "Contact name is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sl_deals")
    .update(patch)
    .eq("id", params.id)
    .select(DEAL_SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deal: data });
}

// Soft delete.
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { deal, forbidden } = await loadDeal(params.id, user);
  if (forbidden) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("sl_deals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
