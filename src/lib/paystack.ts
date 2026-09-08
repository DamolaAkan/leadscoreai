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
}

// A missing/NULL tier is a legacy/grandfathered org — never gated. Only an org
// explicitly on 'free' (or an expired paid plan) loses access to paid features.
export function isPaid(org: OrgBilling | null | undefined): boolean {
  if (!org) return true;
  const tier = org.billing_tier;
  if (tier == null) return true; // grandfathered
  if (tier === "free") return false;
  if (org.billing_status !== "active") return false;
  if (!org.current_period_end) return false;
  return new Date(org.current_period_end).getTime() > Date.now();
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
