import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin, canManage } from "@/lib/invoice-auth";
import { SlBalances } from "@/lib/sl-types";

export const dynamic = "force-dynamic";

const COMMISSION_SELECT =
  "*, deal:sl_deals(contact_name,company_name), owner:admin_users!sl_commissions_owner_id_fkey(id,full_name)";

const EMPTY: Omit<SlBalances, "owner_id"> = {
  pending_naira: 0,
  approved_naira: 0,
  paid_naira: 0,
  outstanding_naira: 0,
};

// GET /api/commissions — ledger rows + summary balances for the scope.
// Reps: own only. Managers: all, or a single rep via ?owner_id.
export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const ownerFilter = url.searchParams.get("owner_id");
  const manager = canManage(user);
  const scopeOwner = !manager ? user.id : ownerFilter || null;

  const supabase = createServiceClient();

  let q = supabase
    .from("sl_commissions")
    .select(COMMISSION_SELECT)
    .order("created_at", { ascending: false });
  if (scopeOwner) q = q.eq("owner_id", scopeOwner);
  if (status) q = q.eq("status", status);
  const { data: rows, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Balances: a single owner row, or summed across everyone for a manager's "all" view.
  const balances = { ...EMPTY };
  let bq = supabase
    .from("sl_balances")
    .select("pending_naira,approved_naira,paid_naira,outstanding_naira,owner_id");
  if (scopeOwner) bq = bq.eq("owner_id", scopeOwner);
  const { data: bRows } = await bq;
  for (const b of bRows || []) {
    balances.pending_naira += Number(b.pending_naira) || 0;
    balances.approved_naira += Number(b.approved_naira) || 0;
    balances.paid_naira += Number(b.paid_naira) || 0;
    balances.outstanding_naira += Number(b.outstanding_naira) || 0;
  }

  return NextResponse.json({ commissions: rows || [], balances });
}
