import { NextResponse } from "next/server";
import { stripeConfigured } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";
import {
  isPaid,
  computeAccess,
  TIERS,
  tierPriceFor,
  currencyFor,
  paystackConfigured,
  OrgBilling,
  plansFor,
  trialDaysFor,
  goLiveOffer,
  canPublish,
  billingPeriodStart,
} from "@/lib/paystack";
import { firstBuilderQuizAt } from "@/lib/go-live";

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

  // Starter's monthly lead allowance: real leads since this month's payment.
  let periodLeadCount = 0;
  const periodStart = b.billing_tier === "starter" && isPaid(b) ? billingPeriodStart(b) : null;
  if (periodStart) {
    const since = periodStart.toISOString();
    const { count: inPeriod } = await supabase
      .from("quiz_responses")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", user.organizationId)
      .gte("created_at", since);
    let testInPeriod = 0;
    if (orgEmail) {
      const { count } = await supabase
        .from("quiz_responses")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", user.organizationId)
        .gte("created_at", since)
        .ilike("contact_email", orgEmail);
      testInPeriod = count ?? 0;
    }
    periodLeadCount = Math.max(0, (inPeriod ?? 0) - testInPeriod);
  }

  const access = computeAccess(b, realLeadCount, periodLeadCount);
  const firstQuizAt = b.self_serve ? await firstBuilderQuizAt(user.organizationId) : null;

  return NextResponse.json({
    tier: b.billing_tier ?? null,
    status: b.billing_status ?? null,
    currentPeriodEnd: b.current_period_end ?? null,
    paid: isPaid(b),
    prices: { core: TIERS.core.naira, pro: TIERS.pro.naira },
    // The plans this org can buy (self-serve: Starter/Business; done-for-you: Core/Pro).
    plans: plansFor(!!b.self_serve).map((t) => ({ tier: t, label: TIERS[t].label, amount: tierPriceFor(t, b) })),
    // NGN = Paystack, USD = Stripe (card subscription, managed in Stripe's portal).
    currency: currencyFor(b),
    stripeManaged: !!(org as { stripe_customer_id?: string | null } | null)?.stripe_customer_id,
    trialDays: trialDaysFor(b),
    // Self-serve go-live offer: ₦10,000 off the first payment, 48h after the first quiz.
    offer: goLiveOffer(b, firstQuizAt),
    // Self-serve: free to build, pay to publish.
    canPublish: canPublish(b),
    configured: currencyFor(b) === "USD" ? stripeConfigured() : paystackConfigured(),
    // Trial / lock state
    locked: access.locked,
    reason: access.reason,
    onboarded: access.onboarded,
    signupDate: b.signup_date ?? null,
    leadsUsed: access.leadsUsed,
    leadLimit: access.leadLimit,
    leadsRemaining: Math.max(0, access.leadLimit - access.leadsUsed),
    // Starter only: real leads this billing month, against its allowance.
    periodLeads: periodStart ? periodLeadCount : null,
    trialEndsAt: access.trialEndsAt,
  });
}
