import type { Currency } from "./money";

// Decides a new self-serve account's billing currency ONCE, at sign-up.
// Nigerians often browse on VPNs, so the IP is only one signal: a +234
// WhatsApp number or a Lagos device clock also count, and none of those change
// with a VPN. Any Nigerian signal = NGN (Paystack); otherwise USD (Stripe).
// Stored on the org with the signals, so the price never flips later.

export interface RegionSignals {
  phone_prefix: string | null; // first 3 digits of the international number
  timezone: string | null; // browser Intl timezone, e.g. "Africa/Lagos"
  ip_country: string | null; // Vercel's x-vercel-ip-country
  landing: string | null; // first-touch path, e.g. "/za/build/solar"
  campaign: string | null; // first-touch utm_campaign
}

const NIGERIA_ZONES = new Set(["Africa/Lagos"]);

export function regionSignals(opts: {
  phone: string | null;
  timezone: unknown;
  request: Request;
  firstTouch?: { path?: string; utm_campaign?: string } | null;
}): RegionSignals {
  const tz = typeof opts.timezone === "string" && opts.timezone.length <= 64 ? opts.timezone : null;
  const ip = opts.request.headers.get("x-vercel-ip-country");
  return {
    phone_prefix: opts.phone ? opts.phone.slice(0, 3) : null,
    timezone: tz,
    ip_country: ip && /^[A-Z]{2}$/.test(ip) ? ip : null,
    landing: opts.firstTouch?.path ?? null,
    campaign: opts.firstTouch?.utm_campaign ?? null,
  };
}

export function decideRegion(s: RegionSignals): { currency: Currency; country: string | null } {
  const nigerian = s.phone_prefix === "234" || (!!s.timezone && NIGERIA_ZONES.has(s.timezone)) || s.ip_country === "NG";
  if (nigerian) return { currency: "NGN", country: "NG" };
  // Best guess at the real country for reporting: the phone's country code
  // isn't mapped here, so use the IP (fine outside Nigeria, where VPNs are rarer).
  return { currency: "USD", country: s.ip_country };
}
