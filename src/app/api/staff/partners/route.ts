import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/invoice-auth";

// The partner programme is Damola's alone (not the sales team).
const FOUNDER_LOGINS = ["akanbi@leadscoreai.com", "akanbidamola"];

export const dynamic = "force-dynamic";

// Partners and what we owe them. Naira commissions settle to their bank via the
// Paystack split; USD clients' commissions are "owed" until the team pays them.
export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user || !FOUNDER_LOGINS.includes(user.email.toLowerCase())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = createServiceClient();
  const [{ data: partners }, { data: earnings }, { data: orgs }] = await Promise.all([
    supabase
      .from("partners")
      .select("id, full_name, email, whatsapp, country, ref_code, bank_name, account_number, account_name, paystack_subaccount_code, status, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("partner_earnings").select("id, partner_id, organization_id, amount_naira, client_paid, status, created_at, paid_at, payout_ref"),
    supabase.from("organizations").select("id, name, partner_id").not("partner_id", "is", null),
  ]);
  const orgName = new Map((orgs ?? []).map((o) => [o.id, o.name]));
  return NextResponse.json({
    partners: (partners ?? []).map((p) => {
      const mine = (earnings ?? []).filter((e) => e.partner_id === p.id);
      return {
        ...p,
        clients: (orgs ?? []).filter((o) => o.partner_id === p.id).length,
        settled: mine.filter((e) => e.status === "settled").reduce((a, e) => a + e.amount_naira, 0),
        paid: mine.filter((e) => e.status === "paid").reduce((a, e) => a + e.amount_naira, 0),
        owed: mine
          .filter((e) => e.status === "owed")
          .map((e) => ({ id: e.id, client: orgName.get(e.organization_id) ?? "", amount: e.amount_naira, clientPaid: e.client_paid, date: e.created_at })),
      };
    }),
  });
}

// Mark owed earnings as paid once the transfer has gone out.
export async function POST(request: Request) {
  const user = await requireAdmin(request);
  if (!user || !FOUNDER_LOGINS.includes(user.email.toLowerCase())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.earning_ids) ? body.earning_ids.filter((x: unknown) => typeof x === "string") : [];
  const ref = String(body.payout_ref || "").trim().slice(0, 120);
  if (!ids.length || !ref) return NextResponse.json({ error: "Choose earnings and enter the transfer reference." }, { status: 400 });
  const { error } = await createServiceClient()
    .from("partner_earnings")
    .update({ status: "paid", paid_at: new Date().toISOString(), payout_ref: ref })
    .in("id", ids)
    .eq("status", "owed");
  if (error) return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
