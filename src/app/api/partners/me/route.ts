import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { PARTNER_COMMISSION_NAIRA, partnerFromRequest } from "@/lib/partners";

export const dynamic = "force-dynamic";

// Everything the partner dashboard shows: link, clients, earnings, bank.
export async function GET(request: Request) {
  const partner = await partnerFromRequest(request);
  if (!partner) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const supabase = createServiceClient();

  const [{ data: orgs }, { data: earnings }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, created_at, billing_status, billing_currency, current_period_end")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("partner_earnings")
      .select("id, organization_id, amount_naira, client_paid, status, created_at, paid_at")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const orgIds = (orgs ?? []).map((o) => o.id);
  const { data: quizzes } = orgIds.length
    ? await supabase.from("quizzes").select("id, organization_id, is_active").in("organization_id", orgIds).not("builder_config", "is", null)
    : { data: [] as { id: string; organization_id: string; is_active: boolean }[] };

  const now = Date.now();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const earnedByOrg = new Map<string, number>();
  for (const e of earnings ?? []) earnedByOrg.set(e.organization_id, (earnedByOrg.get(e.organization_id) ?? 0) + e.amount_naira);

  const clients = (orgs ?? []).map((o) => {
    const qs = (quizzes ?? []).filter((q) => q.organization_id === o.id);
    const paying = o.billing_status === "active" && !!o.current_period_end && new Date(o.current_period_end).getTime() > now;
    return {
      id: o.id,
      name: o.name,
      since: o.created_at,
      status: paying ? "paying" : qs.length ? "demo" : "signed up",
      currency: o.billing_currency || "NGN",
      scorecards: qs.length,
      live: qs.filter((q) => q.is_active).length,
      earned: earnedByOrg.get(o.id) ?? 0,
    };
  });

  const sum = (f: (e: { status: string; created_at: string }) => boolean) =>
    (earnings ?? []).filter(f).reduce((a, e) => a + e.amount_naira, 0);

  const mask = (n: string | null) => (n ? `••••${n.slice(-4)}` : null);
  return NextResponse.json({
    partner: {
      full_name: partner.full_name,
      email: partner.email,
      ref_code: partner.ref_code,
      country: partner.country,
      bank: partner.paystack_subaccount_code
        ? { bank_name: partner.bank_name, account: mask(partner.account_number), account_name: partner.account_name }
        : null,
    },
    commission: PARTNER_COMMISSION_NAIRA,
    stats: {
      paying: clients.filter((c) => c.status === "paying").length,
      clients: clients.length,
      thisMonth: sum((e) => new Date(e.created_at) >= monthStart),
      owed: sum((e) => e.status === "owed"),
      allTime: sum(() => true),
    },
    clients,
    earnings: (earnings ?? []).slice(0, 50).map((e) => ({
      client: (orgs ?? []).find((o) => o.id === e.organization_id)?.name ?? "",
      amount: e.amount_naira,
      clientPaid: e.client_paid,
      status: e.status,
      date: e.created_at,
    })),
  });
}
