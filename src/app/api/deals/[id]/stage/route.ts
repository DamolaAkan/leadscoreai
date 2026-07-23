import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin, canManage } from "@/lib/invoice-auth";

export const dynamic = "force-dynamic";

// POST /api/deals/[id]/stage — advance the funnel or mark lost.
// body: { action: 'meeting_booked' | 'proposal_sent' | 'lost', lost_reason?: string }
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = body.action as string;

  const supabase = createServiceClient();
  const { data: deal } = await supabase
    .from("sl_deals")
    .select("id, owner_id, stage")
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManage(user) && deal.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (deal.stage === "paid") {
    return NextResponse.json({ error: "This deal is already paid" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };

  if (action === "meeting_booked") {
    patch.stage = "meeting_booked";
    patch.meeting_booked_at = now;
  } else if (action === "proposal_sent") {
    patch.stage = "proposal_sent";
    patch.proposal_sent_at = now;
    // If the meeting stamp was skipped, backfill so the cohort report stays honest.
    patch.meeting_booked_at = undefined;
  } else if (action === "lost") {
    patch.stage = "lost";
    patch.lost_at = now;
    patch.lost_reason = (body.lost_reason || "").trim() || null;
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  // Drop undefined so we never clobber an existing timestamp.
  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

  const { error } = await supabase.from("sl_deals").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
