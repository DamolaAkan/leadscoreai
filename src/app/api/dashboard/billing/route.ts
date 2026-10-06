import { NextResponse } from "next/server";
import { getOrgAccess } from "@/lib/access";
import { stripeConfigured } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";
import {
  isPaid,
  TIERS,
  tierPriceFor,
  currencyFor,
  paystackConfigured,
  OrgBilling,
  plansFor,
  trialDaysFor,
  goLiveOffer,
  canPublish,
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

  // Same rule the server enforces on lead-data routes (lib/access).
  const { access, periodLeads } = await getOrgAccess(user.organizationId);
  const periodStart = periodLeads !== null;
  const periodLeadCount = periodLeads ?? 0;

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
