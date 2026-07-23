import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin, canManage } from "@/lib/invoice-auth";

export const dynamic = "force-dynamic";

// POST /api/deals/[id]/pay — mark a deal paid via the sl_mark_deal_paid RPC.
// body: { cbn_rate?: number }  (required only for USD deals)
// The RPC creates a pending commission ONLY if the product is commission-eligible.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: deal } = await supabase
    .from("sl_deals")
    .select("id, owner_id, currency, stage")
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManage(user) && deal.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const cbnRate =
    body.cbn_rate === undefined || body.cbn_rate === null || body.cbn_rate === ""
      ? null
      : Number(body.cbn_rate);

  if (deal.currency === "USD" && (cbnRate === null || !(cbnRate > 0))) {
    return NextResponse.json(
      { error: "A valid CBN rate is required to mark a USD deal paid" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("sl_mark_deal_paid", {
    p_deal_id: params.id,
    p_cbn_rate: cbnRate,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // data is the commission row, or null when the product earns no commission.
  return NextResponse.json({ ok: true, commission: data || null });
}
