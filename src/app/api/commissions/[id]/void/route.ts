import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin, canManage } from "@/lib/invoice-auth";

export const dynamic = "force-dynamic";

// POST /api/commissions/[id]/void — supervisor / super_admin only. Requires a reason.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(user)) {
    return NextResponse.json({ error: "Not authorised to void commissions" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = (body.reason || "").trim();
  if (!reason) {
    return NextResponse.json({ error: "A reason is required to void" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("sl_void_commission", {
    p_commission_id: params.id,
    p_approver_id: user.id,
    p_reason: reason,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
