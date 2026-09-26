// Self-serve funnel activity log (builder_events). Best-effort: logging must
// never break the request it's recording, so every error is swallowed.
import { createServiceClient } from "./supabase";

export interface TrackOpts {
  orgId?: string | null;
  visitorId?: string | null;
  quizId?: string | null;
  path?: string | null;
  props?: Record<string, unknown>;
  request?: Request;
}

export function deviceFrom(ua: string | null): string {
  if (!ua) return "unknown";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

const clean = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function track(event: string, opts: TrackOpts = {}): Promise<void> {
  try {
    const h = opts.request?.headers;
    const supabase = createServiceClient();
    await supabase.from("builder_events").insert({
      event,
      organization_id: opts.orgId || null,
      visitor_id: clean(opts.visitorId, 64),
      quiz_id: opts.quizId || null,
      path: clean(opts.path, 300),
      country: h?.get("x-vercel-ip-country") || null,
      device: h ? deviceFrom(h.get("user-agent")) : null,
      props: opts.props ?? {},
    });
  } catch (e) {
    console.error(`[track] ${event} failed:`, e);
  }
}

// After sign-up, credit the visitor's earlier anonymous events (landing
// visits, clicks) to their new account so we can see what brought them in.
export async function attributeVisitor(visitorId: unknown, orgId: string): Promise<void> {
  const vid = clean(visitorId, 64);
  if (!vid) return;
  try {
    const supabase = createServiceClient();
    await supabase.from("builder_events").update({ organization_id: orgId }).eq("visitor_id", vid).is("organization_id", null);
  } catch (e) {
    console.error("[track] attribute failed:", e);
  }
}

// First-touch attribution captured on the landing page (utm + page + referrer).
export interface FirstTouch {
  path?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  fbclid?: boolean;
}

export function sanitizeFirstTouch(v: unknown): FirstTouch | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const ft: FirstTouch = {};
  for (const k of ["path", "referrer", "utm_source", "utm_medium", "utm_campaign", "utm_content"] as const) {
    const c = clean(o[k], 200);
    if (c) ft[k] = c;
  }
  if (o.fbclid) ft.fbclid = true;
  return Object.keys(ft).length ? ft : null;
}

export function describeFirstTouch(ft: FirstTouch | null): string {
  if (!ft) return "Direct / unknown";
  let ref = "";
  try {
    ref = ft.referrer ? new URL(ft.referrer).hostname : "";
  } catch {
    ref = ft.referrer || "";
  }
  const src = ft.utm_source || (ft.fbclid ? "facebook (ad click)" : ref || "direct");
  const bits = [src, ft.utm_campaign && `campaign “${ft.utm_campaign}”`, ft.path && `landed on ${ft.path}`].filter(Boolean);
  return bits.join(" · ");
}
