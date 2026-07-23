import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin, canManage } from "@/lib/invoice-auth";

export const dynamic = "force-dynamic";

// GET /api/payouts — recent payout runs (managers only).
export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sl_payouts")
    .select("*, owner:admin_users!sl_payouts_owner_id_fkey(id,full_name)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payouts: data || [] });
}

// POST /api/payouts — record a payment run over approved commissions (managers only).
// body: { owner_id, commission_ids: string[], paid_on: 'YYYY-MM-DD', reference?: string }
export async function POST(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const ownerId = body.owner_id as string;
  const ids = Array.isArray(body.commission_ids) ? body.commission_ids : [];
  const paidOn = body.paid_on as string;
  if (!ownerId || ids.length === 0 || !paidOn) {
    return NextResponse.json(
      { error: "Owner, at least one commission, and a payment date are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("sl_record_payout", {
    p_owner_id: ownerId,
    p_commission_ids: ids,
    p_paid_on: paidOn,
    p_reference: (body.reference || "").trim() || null,
    p_created_by: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, payout_id: data });
}
