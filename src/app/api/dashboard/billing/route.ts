import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";
import { isPaid, computeAccess, TIERS, paystackConfigured, OrgBilling } from "@/lib/paystack";

export const dynamic = "force-dynamic";

// Current billing state for the org, for the Settings > Billing UI and the
// paid-feature gate. Resilient to the billing columns not existing yet.
export async function GET(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await validateSession(sessionId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", user.organizationId)
    .single();

  const b = (org || {}) as OrgBilling;
  const orgEmail = (org as { email?: string | null })?.email ?? null;

  // Real leads = all responses EXCEPT test leads (a lead whose email matches the
  // org's own account email — i.e. the client testing their own scorecard).
  const { count: totalLeads } = await supabase
    .from("quiz_responses")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", user.organizationId);
  let testLeads = 0;
  if (orgEmail) {
    const { count } = await supabase
      .from("quiz_responses")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", user.organizationId)
      .ilike("contact_email", orgEmail); // no wildcards = case-insensitive exact
    testLeads = count ?? 0;
  }
  const realLeadCount = Math.max(0, (totalLeads ?? 0) - testLeads);

  const access = computeAccess(b, realLeadCount);

  return NextResponse.json({
    tier: b.billing_tier ?? null,
    status: b.billing_status ?? null,
    currentPeriodEnd: b.current_period_end ?? null,
    paid: isPaid(b),
    prices: { core: TIERS.core.naira, pro: TIERS.pro.naira },
    configured: paystackConfigured(),
    // Trial / lock state
    locked: access.locked,
    reason: access.reason,
    onboarded: access.onboarded,
    signupDate: b.signup_date ?? null,
    leadsUsed: access.leadsUsed,
    leadLimit: access.leadLimit,
    leadsRemaining: Math.max(0, access.leadLimit - access.leadsUsed),
    trialEndsAt: access.trialEndsAt,
  });
}
