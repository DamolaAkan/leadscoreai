import crypto from "crypto";

// Paystack subscription billing for LeadScoreAI dashboards. One-off transactions
// per renewal (so clients can pay by card OR bank transfer / USSD — Paystack
// plan-subscriptions are card-only). Each success keeps them paid for one month.
// No-ops safely until PAYSTACK_SECRET_KEY is set.
export const TIERS = {
  core: { label: "Core", naira: 130000 },
  pro: { label: "Pro", naira: 250000 },
} as const;
export type Tier = keyof typeof TIERS;

export function paystackConfigured(): boolean {
  return !!process.env.PAYSTACK_SECRET_KEY;
}

export interface OrgBilling {
  billing_tier?: string | null;
  billing_status?: string | null;
  current_period_end?: string | null;
  created_at?: string | null;
  // Onboarding sign-off date, set by staff (Stella) when they approve onboarding
  // and activate the account. The 30-day trial clock counts from THIS, not the
  // DB row's creation. Null = onboarding not yet approved (day-clock not started).
  signup_date?: string | null;
}

// Free-trial offer: full dashboard access until the client hits this many REAL
// leads OR this many days from signup — whichever comes first — then the whole
// dashboard locks until they subscribe. (Copy: "first 10 scored free or 30 days".)
export const FREE_LEAD_LIMIT = 10;
export const TRIAL_DAYS = 30;

// True only when the org has a live PAID subscription (core/pro, active, in date).
export function isPaid(org: OrgBilling | null | undefined): boolean {
  if (!org) return false;
  const tier = org.billing_tier;
  if (tier !== "core" && tier !== "pro") return false;
  if (org.billing_status !== "active") return false;
  if (!org.current_period_end) return false;
  return new Date(org.current_period_end).getTime() > Date.now();
}

export type AccessReason =
  | "paid"
  | "grandfathered"
  | "pending_activation"
  | "trial_active"
  | "leads_exhausted"
  | "trial_expired";

export interface AccessState {
  locked: boolean;
  paid: boolean;
  tier: string | null;
  onboarded: boolean; // signup_date set = staff has activated the account
  leadsUsed: number; // real leads only (test leads excluded upstream)
  leadLimit: number;
  trialEndsAt: string | null;
  reason: AccessReason;
}

// Single source of truth for whether a dashboard is locked. `realLeadCount` must
// already EXCLUDE test leads (a lead whose email == the org's own account email).
// - NULL tier   → grandfathered legacy org, never locked.
// - core/pro    → unlocked while the paid period is live.
// - anything else (trial/free/expired) → locked once 10 real leads OR 30 days hit.
export function computeAccess(
  org: OrgBilling | null | undefined,
  realLeadCount: number
): AccessState {
  const tier = org?.billing_tier ?? null;
  const paid = isPaid(org);
  const onboarded = !!org?.signup_date;
  const base = { paid, tier, onboarded, leadsUsed: realLeadCount, leadLimit: FREE_LEAD_LIMIT };

  if (tier == null) {
    return { ...base, locked: false, trialEndsAt: null, reason: "grandfathered" };
  }
  if (paid) {
    return { ...base, locked: false, trialEndsAt: null, reason: "paid" };
  }
  // On the trial. The 30-day clock runs from the staff-set signup_date; until an
  // account is activated it has no day-clock (only the lead limit can lock it).
  const signup = org?.signup_date ? new Date(org.signup_date) : null;
  const trialEndsAt = signup ? new Date(signup.getTime() + TRIAL_DAYS * 24 * 3600 * 1000) : null;
  const leadsExhausted = realLeadCount >= FREE_LEAD_LIMIT;
  const trialExpired = trialEndsAt ? Date.now() >= trialEndsAt.getTime() : false;
  const locked = leadsExhausted || trialExpired;
  const reason: AccessReason = locked
    ? leadsExhausted
      ? "leads_exhausted"
      : "trial_expired"
    : onboarded
      ? "trial_active"
      : "pending_activation";
  return { ...base, locked, trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null, reason };
}

// Initialise a Paystack checkout for a one-off subscription payment.
export async function initTransaction(opts: {
  email: string;
  tier: Tier;
  orgId: string;
  callbackUrl: string;
}) {
  const secret = process.env.PAYSTACK_SECRET_KEY!;
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: opts.email,
      amount: TIERS[opts.tier].naira * 100, // kobo
      currency: "NGN",
      callback_url: opts.callbackUrl,
      metadata: { orgId: opts.orgId, tier: opts.tier, purpose: "leadscoreai_subscription" },
      channels: ["card", "bank", "ussd", "bank_transfer", "qr"],
    }),
  });
  return res.json();
}

// Paystack signs the webhook body with HMAC-SHA512 of the raw payload using the
// secret key. Verify before trusting anything in it.
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}
