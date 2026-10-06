import crypto from "crypto";
import { PRICING, asCurrency, type Currency } from "./money";

// Paystack subscription billing for LeadScoreAI dashboards. One-off transactions
// per renewal (so clients can pay by card OR bank transfer / USSD — Paystack
// plan-subscriptions are card-only). Each success keeps them paid for one month.
// No-ops safely until PAYSTACK_SECRET_KEY is set.
export const TIERS = {
  // Done-for-you clients (Stella builds the scorecard).
  core: { label: "Core", naira: 130000 },
  pro: { label: "Pro", naira: 250000 },
  // Self-serve builder plans: Starter, and Pro (stored as "builder").
  starter: { label: "Starter", naira: 20750 },
  builder: { label: "Pro", naira: 59750 },
} as const;
export type Tier = keyof typeof TIERS;

// What each self-serve plan includes. Starter's one scorecard and both plans' AI
// edits are enforced; leads are the headline allowance (not capped in code).
export const PLAN_LIMITS = {
  starter: { scorecards: 1, edits: 30, leads: 100 },
  builder: { scorecards: Infinity, edits: 150, leads: 1000 },
} as const;

// Start of the current paid month: the last payment (renewals set it), else 30
// days before the period end. Used for monthly edits and Starter's lead allowance.
export function billingPeriodStart(org: OrgBilling | null | undefined): Date | null {
  if (!org?.current_period_end) return null;
  const fallback = new Date(new Date(org.current_period_end).getTime() - 30 * 24 * 3600 * 1000);
  const lastPaid = org.last_paid_at ? new Date(org.last_paid_at) : null;
  return lastPaid && lastPaid > fallback && lastPaid <= new Date() ? lastPaid : fallback;
}

// A paid Starter account: one Buyer Scorecard, one live at a time.
export function isStarter(org: OrgBilling | null | undefined): boolean {
  return !!org?.self_serve && org.billing_tier === "starter" && isPaid(org);
}
export type SelfServeTier = keyof typeof PLAN_LIMITS;
export const isSelfServeTier = (t: unknown): t is SelfServeTier => t === "starter" || t === "builder";

// Pro went from ₦53,750 to ₦59,750. Self-serve owners who signed up before the
// change were quoted the old price (emails, checkout), so they keep it.
export const PRICE_CHANGE_AT = "2026-09-28T09:00:00Z";
export const LEGACY_BUILDER_NAIRA = 53750;

type PricedOrg = { signup_date?: string | null; billing_currency?: string | null } | null | undefined;

// NGN (Paystack) or USD (Stripe). Done-for-you clients are always NGN.
export function currencyFor(org: PricedOrg): Currency {
  return asCurrency(org?.billing_currency);
}

export function isLegacyPrice(org: PricedOrg): boolean {
  return currencyFor(org) === "NGN" && !!org?.signup_date && new Date(org.signup_date) < new Date(PRICE_CHANGE_AT);
}

// What this org pays per month for a tier, in its billing currency.
export function tierPriceFor(tier: Tier, org: PricedOrg): number {
  if (tier === "starter") return currencyFor(org) === "USD" ? PRICING.USD.starter : TIERS.starter.naira;
  if (tier === "builder" && currencyFor(org) === "USD") return PRICING.USD.pro;
  return tier === "builder" && isLegacyPrice(org) ? LEGACY_BUILDER_NAIRA : TIERS[tier].naira;
}

// Lowest monthly price anyone can legitimately pay for a tier (webhook sanity floor).
export function tierPriceFloor(tier: Tier): number {
  return tier === "builder" ? Math.min(LEGACY_BUILDER_NAIRA, TIERS.builder.naira) : TIERS[tier].naira;
}

// Which plans an org can buy: self-serve builder accounts get Starter or Pro,
// done-for-you clients keep Core/Pro.
export function plansFor(selfServe: boolean): Tier[] {
  return selfServe ? ["starter", "builder"] : ["core", "pro"];
}

// Self-serve builder model: FREE TO BUILD, PAY TO PUBLISH. Building and
// previewing quizzes is free; putting one live needs the Pro plan. Accounts
// created before this switch keep the 7-day free trial they signed up under.
export const PAY_TO_PUBLISH_FROM = "2026-09-26T18:00:00Z";

// Go-live offer: ₦10,000 off the FIRST payment (₦49,750 instead of ₦59,750),
// for 48 hours after the owner builds their first quiz.
export const GO_LIVE_DISCOUNT_NAIRA = 10000;
export const GO_LIVE_OFFER_HOURS = 48;

export interface EarlyOffer {
  eligible: boolean;
  discount: number;
  endsAt: string | null;
}

export function goLiveOffer(org: OrgBilling | null | undefined, firstQuizAt: string | null): EarlyOffer {
  const none = { eligible: false, discount: 0, endsAt: null };
  if (!org?.self_serve || org.last_paid_at || !firstQuizAt) return none;
  const endsAt = new Date(new Date(firstQuizAt).getTime() + GO_LIVE_OFFER_HOURS * 3600 * 1000);
  if (Date.now() >= endsAt.getTime()) return none;
  return { eligible: true, discount: PRICING[currencyFor(org)].goLiveDiscount, endsAt: endsAt.toISOString() };
}

// Signed up before pay-to-publish: still on the old 7-day free trial.
export function isLegacyTrial(org: OrgBilling | null | undefined): boolean {
  return !!org?.self_serve && !!org.signup_date && new Date(org.signup_date) < new Date(PAY_TO_PUBLISH_FROM);
}

function legacyTrialActive(org: OrgBilling | null | undefined): boolean {
  if (!isLegacyTrial(org) || !org?.signup_date) return false;
  const ends = new Date(org.signup_date).getTime() + SELF_SERVE_TRIAL_DAYS * 24 * 3600 * 1000;
  return Date.now() < ends;
}

// May this org's quizzes be live? Done-for-you clients: always (their own
// lock handles billing). Self-serve: only on a paid plan, or during a legacy trial.
export function canPublish(org: OrgBilling | null | undefined): boolean {
  if (!org?.self_serve) return true;
  return isPaid(org) || legacyTrialActive(org);
}

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
  // Self-serve builder sign-ups get a shorter trial (SELF_SERVE_TRIAL_DAYS).
  self_serve?: boolean | null;
  last_paid_at?: string | null;
  billing_currency?: string | null; // "NGN" (Paystack) | "USD" (Stripe)
}

// Free-trial offer: full dashboard access until the client hits this many REAL
// leads OR this many days from signup — whichever comes first — then the whole
// dashboard locks until they subscribe. (Copy: "first 10 scored free or 30 days".)
export const FREE_LEAD_LIMIT = 10;
export const TRIAL_DAYS = 30;
export const SELF_SERVE_TRIAL_DAYS = 7;

export function trialDaysFor(org: OrgBilling | null | undefined): number {
  return org?.self_serve ? SELF_SERVE_TRIAL_DAYS : TRIAL_DAYS;
}

// True only when the org has a live PAID subscription (core/pro, active, in date).
export function isPaid(org: OrgBilling | null | undefined): boolean {
  if (!org) return false;
  const tier = org.billing_tier;
  if (!tier || !(tier in TIERS)) return false;
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
  | "plan_leads_exhausted" // paid Starter past its monthly lead allowance: upgrade to see leads
  | "trial_expired"
  | "build_free"; // self-serve, unpaid: builds free, can't publish yet

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
  realLeadCount: number,
  periodLeadCount = 0 // real leads in the current billing month (Starter's allowance)
): AccessState {
  const tier = org?.billing_tier ?? null;
  const paid = isPaid(org);
  const onboarded = !!org?.signup_date;
  const base = { paid, tier, onboarded, leadsUsed: realLeadCount, leadLimit: FREE_LEAD_LIMIT };

  if (tier == null) {
    return { ...base, locked: false, trialEndsAt: null, reason: "grandfathered" };
  }
  if (paid) {
    // Starter includes 100 leads a month. Past that the scorecard keeps working and
    // keeps collecting; only the dashboard locks until they upgrade to Pro.
    if (org?.billing_tier === "starter" && periodLeadCount > PLAN_LIMITS.starter.leads) {
      return { ...base, leadsUsed: periodLeadCount, leadLimit: PLAN_LIMITS.starter.leads, locked: true, trialEndsAt: null, reason: "plan_leads_exhausted" };
    }
    return { ...base, locked: false, trialEndsAt: null, reason: "paid" };
  }
  // Self-serve builder accounts are never locked out: building is free, and
  // going live is what needs payment (see canPublish).
  if (org?.self_serve) {
    if (legacyTrialActive(org)) {
      const ends = new Date(new Date(org.signup_date!).getTime() + SELF_SERVE_TRIAL_DAYS * 24 * 3600 * 1000);
      return { ...base, locked: false, trialEndsAt: ends.toISOString(), reason: "trial_active" };
    }
    return { ...base, locked: false, trialEndsAt: null, reason: "build_free" };
  }
  // On the trial. The 30-day clock runs from the staff-set signup_date; until an
  // account is activated it has no day-clock (only the lead limit can lock it).
  const signup = org?.signup_date ? new Date(org.signup_date) : null;
  const trialEndsAt = signup ? new Date(signup.getTime() + trialDaysFor(org) * 24 * 3600 * 1000) : null;
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
  priceNaira: number; // tierPriceFor(tier, org)
  orgId: string;
  callbackUrl: string;
  discountNaira?: number; // go-live offer, first payment only
  publishQuizId?: string | null; // quiz to put live once this payment succeeds
  split?: { subaccount: string; transaction_charge: number; bearer: "account" } | null; // partner commission
}) {
  const discount = opts.discountNaira || 0;
  const secret = process.env.PAYSTACK_SECRET_KEY!;
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: opts.email,
      amount: (opts.priceNaira - discount) * 100, // kobo
      currency: "NGN",
      callback_url: opts.callbackUrl,
      metadata: {
        orgId: opts.orgId,
        tier: opts.tier,
        purpose: "leadscoreai_subscription",
        discount_naira: discount,
        publish_quiz_id: opts.publishQuizId || null,
        partner_split: !!opts.split,
      },
      ...(opts.split || {}),
      // Bank transfer first: it's how most Nigerians pay. No "bank" (pay with
      // online banking) option: it confused buyers and failed (2026-09-27).
      channels: ["bank_transfer", "card", "ussd", "qr"],
    }),
  });
  return res.json();
}

// Checkout for a builder AI-edit top-up (any amount from the minimum up).
export async function initTopupTransaction(opts: {
  email: string;
  orgId: string;
  amountNaira: number;
  credits: number;
  callbackUrl: string;
}) {
  const secret = process.env.PAYSTACK_SECRET_KEY!;
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: opts.email,
      amount: opts.amountNaira * 100, // kobo
      currency: "NGN",
      callback_url: opts.callbackUrl,
      metadata: {
        orgId: opts.orgId,
        purpose: "leadscoreai_topup",
        amount_naira: opts.amountNaira,
        credits: opts.credits,
      },
      channels: ["bank_transfer", "card", "ussd", "qr"],
    }),
  });
  return res.json();
}

// Paystack rejects placeholder/demo domains: first genuinely valid email wins.
export function pickBillingEmail(...candidates: (string | null | undefined)[]): string | null {
  for (const e of candidates) {
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) continue;
    const domain = e.split("@")[1].toLowerCase();
    if (/\.(example|test|invalid|localhost)$/.test(domain)) continue;
    if (["example.com", "example.org", "example.net"].includes(domain)) continue;
    return e;
  }
  return null;
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
