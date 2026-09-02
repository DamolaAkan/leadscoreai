import crypto from "crypto";

// Server-side Meta Conversions API (CAPI). Fires a `Lead` event to the
// Siteflipmarket dataset (the pixel the ads run on) for every completed scorecard — un-blockable by ad-blockers
// / iOS, unlike the browser pixel. It de-dupes against the browser pixel because
// both send the SAME event_id (the responseId). No-ops until META_CAPI_TOKEN is set.
const PIXEL_ID = "1351695133750893"; // Siteflipmarket dataset (matches the ads)
const API_VERSION = "v21.0";

function sha256(v: string): string {
  return crypto.createHash("sha256").update(v).digest("hex");
}
function normEmail(e?: string): string {
  return (e || "").trim().toLowerCase();
}
// Meta wants digits only, incl. country code. Normalise Nigerian numbers.
function normPhone(p?: string): string {
  const d = (p || "").replace(/[^0-9]/g, "");
  if (!d) return "";
  if (d.startsWith("234")) return d;
  if (d.startsWith("0") && d.length === 11) return "234" + d.slice(1);
  if (d.length === 10) return "234" + d;
  return d;
}
function nameParts(n?: string): { fn: string; ln: string } {
  const parts = (n || "").trim().split(/\s+/).filter(Boolean);
  return {
    fn: parts[0]?.toLowerCase() || "",
    ln: parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "",
  };
}

export interface MetaLeadInput {
  eventId: string; // MUST equal the browser pixel eventID (the responseId) for dedup
  email?: string;
  phone?: string;
  name?: string;
  eventSourceUrl?: string;
  clientIp?: string;
  userAgent?: string;
  funnel?: string; // "solar" | "mortgage"
}

export async function sendMetaLead(input: MetaLeadInput): Promise<void> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token || !input.eventId) return; // not configured yet — safe no-op

  const { fn, ln } = nameParts(input.name);
  const user_data: Record<string, unknown> = {};
  const em = normEmail(input.email);
  if (em) user_data.em = [sha256(em)];
  const ph = normPhone(input.phone);
  if (ph) user_data.ph = [sha256(ph)];
  if (fn) user_data.fn = [sha256(fn)];
  if (ln) user_data.ln = [sha256(ln)];
  user_data.external_id = [sha256(input.eventId)];
  if (input.clientIp) user_data.client_ip_address = input.clientIp;
  if (input.userAgent) user_data.client_user_agent = input.userAgent;

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        ...(input.eventSourceUrl ? { event_source_url: input.eventSourceUrl } : {}),
        user_data,
        custom_data: { content_name: input.funnel || "scorecard" },
      },
    ],
  };
  if (process.env.META_CAPI_TEST_CODE) {
    body.test_event_code = process.env.META_CAPI_TEST_CODE;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[meta-capi] non-OK:", res.status, t.slice(0, 300));
    }
  } catch (e) {
    console.error("[meta-capi] error:", e);
  }
}

// Pull the best-available client signals from the inbound request.
export function clientSignals(request: Request): { clientIp?: string; userAgent?: string; eventSourceUrl?: string } {
  const fwd = request.headers.get("x-forwarded-for") || "";
  const clientIp = fwd.split(",")[0].trim() || undefined;
  const userAgent = request.headers.get("user-agent") || undefined;
  const eventSourceUrl = request.headers.get("referer") || undefined;
  return { clientIp, userAgent, eventSourceUrl };
}
