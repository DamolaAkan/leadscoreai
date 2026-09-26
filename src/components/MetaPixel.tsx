"use client";

import Script from "next/script";

// Meta (Facebook) pixel used for the microfinance ad campaign. Loaded only on
// the MFB funnel pages (landing + Loan Doctor scorecard), never on client
// dashboards. Fire conversion events elsewhere with `trackPixel("Lead")`.
// Siteflipmarket dataset — the pixel the Meta ads are published against; shared
// across the microfinance, solar and mortgage funnels.
export const META_PIXEL_ID = "1351695133750893";

export function trackPixel(event: string): void {
  if (typeof window !== "undefined") {
    const w = window as unknown as { fbq?: (...args: unknown[]) => void };
    if (typeof w.fbq === "function") w.fbq("track", event);
  }
}

type LeadUserData = {
  email?: string;
  phone?: string;
  fullName?: string;
  externalId?: string;
};

// Fire a Lead with Advanced Matching. We pass the contact info the scorecard
// already collected so Meta can match the lead to a real person — this is what
// lifts Event Match Quality (and therefore optimisation) well above the bare
// browser-signal baseline. The browser pixel SHA-256 hashes em/ph/fn/ln itself,
// so we send plain values. The eventID lets us de-dupe if we add server-side
// (CAPI) events later.
export function trackLead(data: LeadUserData, pixelId: string = META_PIXEL_ID): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { fbq?: (...args: unknown[]) => void };
  if (typeof w.fbq !== "function") return;

  const am: Record<string, string> = {};
  if (data.email) am.em = data.email.trim().toLowerCase();
  if (data.phone) am.ph = data.phone.replace(/[^0-9]/g, "");
  if (data.fullName) {
    const parts = data.fullName.trim().split(/\s+/).filter(Boolean);
    if (parts[0]) am.fn = parts[0].toLowerCase();
    if (parts.length > 1) am.ln = parts[parts.length - 1].toLowerCase();
  }
  if (data.externalId) am.external_id = data.externalId;

  // Re-init with the advanced-matching payload, then track against this pixel.
  w.fbq("init", pixelId, am);
  w.fbq("track", "Lead", {}, data.externalId ? { eventID: data.externalId } : undefined);
}

// Any standard event with a dedup id shared with the server (Conversions API).
export function trackPixelEvent(event: string, params: Record<string, unknown> = {}, eventId?: string): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { fbq?: (...args: unknown[]) => void };
  if (typeof w.fbq !== "function") return;
  w.fbq("track", event, params, eventId ? { eventID: eventId } : undefined);
}

// Quiz builder checkout: record InitiateCheckout now and remember the payment,
// so Purchase can be recorded (same id as the server) when Paystack sends them back.
const PENDING_KEY = "lsai-pending-purchase";

export function checkoutStartedPixel(d: { reference?: string; amountNaira?: number; metaEventId?: string }): void {
  if (!d.reference) return;
  trackPixelEvent("InitiateCheckout", { value: d.amountNaira, currency: "NGN" }, d.metaEventId);
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ reference: d.reference, amountNaira: d.amountNaira, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

// Back from Paystack (?reference=…): record the Purchase once.
export function purchaseReturnPixel(): void {
  try {
    const ref = new URLSearchParams(window.location.search).get("reference");
    const raw = localStorage.getItem(PENDING_KEY);
    if (!ref || !raw) return;
    const p = JSON.parse(raw) as { reference: string; amountNaira?: number };
    if (p.reference !== ref) return;
    localStorage.removeItem(PENDING_KEY);
    // Give the pixel script a moment to load on this page before firing.
    setTimeout(() => trackPixelEvent("Purchase", { value: p.amountNaira, currency: "NGN" }, `purchase_${ref}`), 1500);
  } catch {
    /* ignore */
  }
}

export default function MetaPixel({ pixelId = META_PIXEL_ID }: { pixelId?: string }) {
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`}
      </Script>
      {/* No <noscript> image: React renders it for normal visitors too, which
          sent a second PageView on every visit. */}
    </>
  );
}
