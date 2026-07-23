import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin, canManage } from "@/lib/invoice-auth";

export const dynamic = "force-dynamic";

// POST /api/commissions/[id]/approve — supervisor / super_admin only.
// The RPC additionally blocks approving your own commission.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(user)) {
    return NextResponse.json({ error: "Not authorised to approve commissions" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("sl_approve_commission", {
    p_commission_id: params.id,
    p_approver_id: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
