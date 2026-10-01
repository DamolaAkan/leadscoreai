import crypto from "crypto";
import { createServiceClient } from "./supabase";

// Partner programme. Marketers bring clients and earn a flat ₦11,950 (20% of
// ₦59,750) for every paying client, every month, whatever the client pays.
// Naira clients: Paystack splits the partner's share to their bank sub-account
// at payment time ("settled"). USD clients: the earning is "owed" and paid by
// the team. Payouts only ever go to a Nigerian bank account.

export const PARTNER_COMMISSION_NAIRA = 11950;
export const PARTNER_REF_COOKIE = "lsai_ref";
const SESSION_DAYS = 30;

export interface Partner {
  id: string;
  ref_code: string;
  full_name: string;
  email: string;
  whatsapp: string | null;
  country: string;
  business_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  paystack_subaccount_code: string | null;
  status: string;
  created_at: string;
}

// Codes share the builder_codes table, namespaced so a partner code can never
// sign anyone into a business account.
export const partnerCodeKey = (email: string) => `partner:${email}`;

export function newRefCode(name: string): string {
  const first = (name.trim().split(/\s+/)[0] || "partner").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "partner";
  return `${first}${crypto.randomBytes(2).toString("hex")}`;
}

export async function createPartnerSession(partnerId: string): Promise<string> {
  const sessionId = `ptn-${Date.now()}-${crypto.randomBytes(16).toString("hex")}`;
  await createServiceClient()
    .from("partner_sessions")
    .insert({ session_id: sessionId, partner_id: partnerId, expires_at: new Date(Date.now() + SESSION_DAYS * 86400000).toISOString() });
  return sessionId;
}

export async function partnerFromRequest(request: Request): Promise<Partner | null> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ptn-")) return null;
  const supabase = createServiceClient();
  const { data: s } = await supabase
    .from("partner_sessions")
    .select("partner_id, expires_at")
    .eq("session_id", auth.slice(7))
    .maybeSingle();
  if (!s || new Date(s.expires_at) < new Date()) return null;
  const { data: p } = await supabase.from("partners").select("*").eq("id", s.partner_id).eq("status", "active").maybeSingle();
  return (p as Partner) || null;
}

// The ?ref= code a visitor arrived with (set by RefCapture), if any.
export function refCodeFromRequest(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${PARTNER_REF_COOKIE}=([a-z0-9]{3,40})`));
  return m ? m[1] : null;
}

export async function activePartnerIdByRef(ref: string | null): Promise<string | null> {
  if (!ref) return null;
  const { data } = await createServiceClient().from("partners").select("id").eq("ref_code", ref).eq("status", "active").maybeSingle();
  return data?.id ?? null;
}

// Paystack split for a referred business's subscription payment: the partner's
// sub-account gets exactly the commission, we keep the rest and bear the fees.
export async function paystackSplitFor(
  orgId: string,
  amountNaira: number
): Promise<{ subaccount: string; transaction_charge: number; bearer: "account" } | null> {
  if (amountNaira <= PARTNER_COMMISSION_NAIRA) return null;
  const supabase = createServiceClient();
  const { data: org } = await supabase.from("organizations").select("partner_id").eq("id", orgId).maybeSingle();
  if (!org?.partner_id) return null;
  const { data: p } = await supabase
    .from("partners")
    .select("paystack_subaccount_code, status")
    .eq("id", org.partner_id)
    .maybeSingle();
  if (!p?.paystack_subaccount_code || p.status !== "active") return null;
  return {
    subaccount: p.paystack_subaccount_code,
    transaction_charge: (amountNaira - PARTNER_COMMISSION_NAIRA) * 100,
    bearer: "account",
  };
}

// One earning per paid subscription payment of a referred business. Safe to
// call twice for the same payment (payment_ref is unique).
export async function recordPartnerEarning(opts: {
  orgId: string;
  paymentRef: string;
  clientPaid: string;
  settled: boolean;
}): Promise<void> {
  if (!opts.paymentRef) return;
  const supabase = createServiceClient();
  const { data: org } = await supabase.from("organizations").select("partner_id").eq("id", opts.orgId).maybeSingle();
  if (!org?.partner_id) return;
  const { error } = await supabase.from("partner_earnings").insert({
    partner_id: org.partner_id,
    organization_id: opts.orgId,
    amount_naira: PARTNER_COMMISSION_NAIRA,
    client_paid: opts.clientPaid,
    payment_ref: opts.paymentRef,
    status: opts.settled ? "settled" : "owed",
  });
  if (error && error.code !== "23505") console.error("[partners] earning insert error:", error.message);
}

export async function paystackApi<T = unknown>(path: string, init?: RequestInit): Promise<{ ok: boolean; data: T; message?: string }> {
  const res = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.status !== false, data: json.data as T, message: json.message };
}
