import crypto from "crypto";
import { PRICING } from "./money";

// Stripe billing for self-serve accounts outside Nigeria (USD). Same Stripe
// account as Practice Interactions: every LeadScoreAI object carries
// metadata app=leadscoreai + lsai_org_id so PI's webhook ignores ours and ours
// ignores PI's. Env names mirror PI (STRIPE_MODE picks _LIVE/_TEST keys).

// "live" (any case; stray spaces or quotes ignored) switches to the live keys.
const isLive = () => (process.env.STRIPE_MODE || "").trim().replace(/^["']|["']$/g, "").trim().toLowerCase() === "live";

function secretKey(): string | undefined {
  return (
    process.env.STRIPE_SECRET_KEY?.trim() ||
    (isLive() ? process.env.STRIPE_SECRET_KEY_LIVE : process.env.STRIPE_SECRET_KEY_TEST)?.trim()
  );
}

export function stripeWebhookSecret(): string | undefined {
  return (
    process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
    (isLive() ? process.env.STRIPE_WEBHOOK_SECRET_LIVE : process.env.STRIPE_WEBHOOK_SECRET_TEST)?.trim()
  );
}

// Non-secret facts for debugging config: which mode was read and what kind of
// key is in use (only the "sk_live"/"sk_test" style prefix, never the key).
export function stripeDiagnostics(): { mode: "live" | "test"; key: "live" | "test" | "none" | "unknown" } {
  const k = secretKey() || "";
  const key = !k ? "none" : /^(sk|rk)_live_/.test(k) ? "live" : /^(sk|rk)_test_/.test(k) ? "test" : "unknown";
  return { mode: isLive() ? "live" : "test", key };
}

export function stripeConfigured(): boolean {
  return !!secretKey();
}

export const STRIPE_APP = "leadscoreai";
const GO_LIVE_COUPON = "lsai_golive_usd_10";

// Stripe's form encoding: nested objects/arrays become a[b][0][c]=v.
function encode(params: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === "object") out.push(...encode(item as Record<string, unknown>, `${key}[${i}]`));
        else out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof v === "object") {
      out.push(...encode(v as Record<string, unknown>, key));
    } else {
      out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return out;
}

export interface StripeResult<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T & { error?: { message?: string; code?: string } };
}

export async function stripe<T = Record<string, unknown>>(
  method: "GET" | "POST",
  path: string,
  params: Record<string, unknown> = {},
  idempotencyKey?: string
): Promise<StripeResult<T>> {
  const body = encode(params).join("&");
  const url = `https://api.stripe.com/v1/${path}${method === "GET" && body ? `?${body}` : ""}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${secretKey()}` };
  if (method === "POST") headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const res = await fetch(url, { method, headers, body: method === "POST" ? body : undefined });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// Signature scheme: t=<ts>,v1=<hex hmac-sha256 of "t.payload">. Rejects >5 min old.
export function verifyStripeSignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  let t = "";
  const v1s: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=");
    if (k === "t") t = v;
    if (k === "v1" && v) v1s.push(v);
  }
  if (!t || !v1s.length) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - parseInt(t, 10));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  return v1s.some((v1) => v1.length === expected.length && crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected)));
}

// One-time $10-off coupon for the go-live offer, created on first use.
async function goLiveCoupon(): Promise<string> {
  const found = await stripe("GET", `coupons/${GO_LIVE_COUPON}`);
  if (found.ok) return GO_LIVE_COUPON;
  const made = await stripe("POST", "coupons", {
    id: GO_LIVE_COUPON,
    name: "Go-live offer: first month",
    amount_off: PRICING.USD.goLiveDiscount * 100,
    currency: "usd",
    duration: "once",
  });
  if (!made.ok && made.data.error?.code !== "resource_already_exists") {
    throw new Error(made.data.error?.message || "Could not create the go-live coupon");
  }
  return GO_LIVE_COUPON;
}

const orgMeta = (orgId: string, purpose: string, extra: Record<string, string> = {}) => ({
  app: STRIPE_APP,
  lsai_org_id: orgId,
  purpose,
  ...extra,
});

// Hosted Checkout for the monthly Pro subscription.
export async function createSubscriptionCheckout(opts: {
  orgId: string;
  email: string;
  customerId?: string | null;
  priceUsd: number;
  discountUsd: number;
  publishQuizId?: string | null;
  successUrl: string;
  cancelUrl: string;
}) {
  const meta = orgMeta(opts.orgId, "leadscoreai_subscription", opts.publishQuizId ? { publish_quiz_id: opts.publishQuizId } : {});
  return stripe<{ id: string; url: string }>("POST", "checkout/sessions", {
    mode: "subscription",
    client_reference_id: opts.orgId,
    ...(opts.customerId ? { customer: opts.customerId } : { customer_email: opts.email }),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(opts.priceUsd * 100),
          recurring: { interval: "month" },
          product_data: { name: "LeadScoreAI Pro" },
        },
      },
    ],
    ...(opts.discountUsd > 0 ? { discounts: [{ coupon: await goLiveCoupon() }] } : {}),
    metadata: meta,
    subscription_data: { metadata: meta },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  });
}

// Hosted Checkout for a one-off AI-edit top-up.
export async function createTopupCheckout(opts: {
  orgId: string;
  email: string;
  customerId?: string | null;
  amountUsd: number;
  credits: number;
  successUrl: string;
  cancelUrl: string;
}) {
  const meta = orgMeta(opts.orgId, "leadscoreai_topup", { credits: String(opts.credits) });
  return stripe<{ id: string; url: string }>("POST", "checkout/sessions", {
    mode: "payment",
    client_reference_id: opts.orgId,
    ...(opts.customerId ? { customer: opts.customerId } : { customer_email: opts.email }),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(opts.amountUsd * 100),
          product_data: { name: `LeadScoreAI: ${opts.credits} AI edits` },
        },
      },
    ],
    metadata: meta,
    payment_intent_data: { metadata: meta },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  });
}

// Stripe-hosted page where a USD customer updates their card or cancels.
export async function createPortalSession(customerId: string, returnUrl: string) {
  return stripe<{ url: string }>("POST", "billing_portal/sessions", { customer: customerId, return_url: returnUrl });
}

export interface StripeSubscription {
  id: string;
  status: string; // active | trialing | past_due | unpaid | canceled | incomplete | incomplete_expired | paused
  customer: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number; // older API versions
  items?: { data?: { current_period_end?: number }[] };
  metadata?: Record<string, string>;
}

export async function getSubscription(id: string) {
  return stripe<StripeSubscription>("GET", `subscriptions/${id}`);
}

// Period end moved from the subscription to its items in newer API versions.
export function periodEndOf(sub: StripeSubscription): Date | null {
  const s = sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end;
  return s ? new Date(s * 1000) : null;
}

// Our billing_status for a Stripe subscription status. past_due stays "active"
// (Stripe is still retrying the card); access ends at current_period_end anyway.
export function billingStatusFor(status: string): "active" | "canceled" {
  return ["active", "trialing", "past_due"].includes(status) ? "active" : "canceled";
}
