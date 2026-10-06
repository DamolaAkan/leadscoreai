// Self-serve pricing per billing currency. Nigeria pays in naira through
// Paystack; everyone else pays in US dollars through Stripe. Client-safe (no
// server imports) so the studio, dashboard and landing pages share one source.

export type Currency = "NGN" | "USD";

export const PRICING = {
  NGN: {
    starter: 20750, // Starter: 1 live scorecard, 30 AI edits a month
    pro: 59750, // pre-2026-09-28 sign-ups keep ₦53,750 (see tierPriceFor)
    goLiveDiscount: 10000,
    topupStep: 10000, // ₦10,000 = 45 AI edits
    editsPerStep: 45,
  },
  USD: {
    starter: 20,
    pro: 49,
    goLiveDiscount: 10, // $39 first month
    topupStep: 10, // $10 = 70 AI edits (>50% margin after Stripe fees)
    editsPerStep: 70,
  },
} as const;

export const asCurrency = (c: unknown): Currency => (c === "USD" ? "USD" : "NGN");

export function money(amount: number, currency: Currency = "NGN"): string {
  const n = Math.round(amount * 100) / 100;
  return currency === "USD"
    ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
    : `₦${Math.round(n).toLocaleString("en-NG")}`;
}

// AI edits a top-up buys (whole steps only).
export function editsFor(amount: number, currency: Currency): number {
  const p = PRICING[currency];
  return Math.floor(amount / p.topupStep) * p.editsPerStep;
}
