import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/invoice-auth";

export const dynamic = "force-dynamic";

// Company-wide monthly revenue goal, shared across all reps. Mix and match:
// 20 Starter (N500k), 5 premium (N2M), or anything in between.
const COMPANY_MONTHLY_SETUP_NAIRA = 10_000_000;

// GET /api/goals — the signed-in rep's personal commission goal + progress,
// plus company-target progress for the current month.
export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ data: goal }, { data: yearRows }, { data: monthRows }] = await Promise.all([
    supabase.from("sl_rep_goals").select("annual_target_naira").eq("owner_id", user.id).maybeSingle(),
    supabase
      .from("sl_commissions")
      .select("commission_naira")
      .eq("owner_id", user.id)
      .in("status", ["pending", "approved", "paid"])
      .gte("created_at", yearStart),
    // Company-wide closes this month (all reps), with owner_id so each rep
    // also sees their own contribution to the shared goal.
    supabase
      .from("sl_commissions")
      .select("owner_id, setup_fee_naira")
      .in("status", ["pending", "approved", "paid"])
      .gte("created_at", monthStart),
  ]);

  const earnedYear = (yearRows || []).reduce((s, r) => s + Number(r.commission_naira || 0), 0);
  const dealsYear = (yearRows || []).length;
  const companyDealsMonth = (monthRows || []).length;
  const companySetupMonth = (monthRows || []).reduce((s, r) => s + Number(r.setup_fee_naira || 0), 0);
  const mySetupMonth = (monthRows || [])
    .filter((r) => r.owner_id === user.id)
    .reduce((s, r) => s + Number(r.setup_fee_naira || 0), 0);

  return NextResponse.json({
    annual_target_naira: Number(goal?.annual_target_naira || 0),
    earned_year_naira: earnedYear,
    deals_closed_year: dealsYear,
    company: {
      monthly_setup_target_naira: COMPANY_MONTHLY_SETUP_NAIRA,
      setup_this_month_naira: companySetupMonth,
      deals_this_month: companyDealsMonth,
      my_setup_this_month_naira: mySetupMonth,
    },
  });
}

// PUT /api/goals — set your own annual commission goal.
export async function PUT(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { annual_target_naira } = await request.json();
  const target = Number(annual_target_naira);
  if (!Number.isFinite(target) || target < 0 || target > 100_000_000_000) {
    return NextResponse.json({ error: "Enter a valid target amount" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("sl_rep_goals")
    .upsert({ owner_id: user.id, annual_target_naira: target, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "Failed to save goal" }, { status: 500 });

  return NextResponse.json({ ok: true, annual_target_naira: target });
}
