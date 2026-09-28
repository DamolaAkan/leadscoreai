import { NextResponse } from "next/server";
import { createServiceClient } from "./supabase";
import { validateSession, getSessionIdFromRequest } from "./auth";
import { decrypt } from "./encryption";
import { sendSequenceEmail } from "./email";
import { RESERVED_SLUGS, slugify } from "./builder";
import type { AuthUser } from "./dashboard-types";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// WhatsApp number from the sign-up form → international digits (no +), or null.
// Nigerian local numbers (0811…) become 234811…; anything else must already
// carry its country code.
export function normalizeWhatsApp(raw: unknown): string | null {
  let d = String(raw ?? "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (/^0\d{10}$/.test(d)) d = "234" + d.slice(1);
  else if (/^[789]\d{9}$/.test(d)) d = "234" + d; // Nigerian number without the 0
  d = d.replace(/\D/g, "");
  return /^\d{10,15}$/.test(d) ? d : null;
}

// Tap-to-chat link for team alerts.
export const waLink = (digits: string) => `https://wa.me/${digits}`;

// Escape % _ \ so a user's email can't act as an ILIKE wildcard pattern.
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Resolve the Resend key the same way the dashboard login does.
export async function getResendKey(): Promise<string | undefined> {
  const supabase = createServiceClient();
  const { data: features } = await supabase
    .from("org_features")
    .select("resend_api_key")
    .not("resend_api_key", "is", null)
    .limit(1)
    .maybeSingle();
  return features?.resend_api_key ? decrypt(features.resend_api_key) : process.env.RESEND_API_KEY;
}

// Every builder API call: Bearer <org session id> → the signed-in org.
export async function requireBuilderUser(
  request: Request
): Promise<{ user: AuthUser } | { error: NextResponse }> {
  const sessionId = getSessionIdFromRequest(request);
  const user = sessionId ? await validateSession(sessionId) : null;
  if (!user) {
    return { error: NextResponse.json({ error: "Please sign in again." }, { status: 401 }) };
  }
  return { user };
}

// A slug that is free, not reserved, and URL-safe.
export async function uniqueOrgSlug(name: string): Promise<string> {
  const supabase = createServiceClient();
  const base = slugify(name, "business").slice(0, 32);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (RESERVED_SLUGS.has(candidate)) continue;
    const { data } = await supabase.from("organizations").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function uniqueQuizSlug(orgId: string, name: string): Promise<string> {
  const supabase = createServiceClient();
  const base = slugify(name, "quiz").slice(0, 40);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const { data } = await supabase
      .from("quizzes")
      .select("id")
      .eq("organization_id", orgId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// An owner asked the builder for something it can't do yet. Log it (product
// feedback) and email Stella so she can follow up. Never throws.
export async function logFeatureRequest(r: {
  organizationId: string;
  orgName: string;
  ownerEmail: string;
  quizId: string | null;
  request: string;
  ownerMessage: string;
}): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("builder_feature_requests").insert({
      organization_id: r.organizationId,
      quiz_id: r.quizId,
      request: r.request,
      owner_message: r.ownerMessage.slice(0, 2000),
    });
    if (error) console.error("[builder] feature request log error:", error.message);

    const apiKey = await getResendKey();
    if (!apiKey) return;
    const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;color:#1f2533;font-size:15px;line-height:1.6;">
  <p style="margin:0 0 12px;"><b>${escapeHtml(r.orgName)}</b> (${escapeHtml(r.ownerEmail)}) asked the quiz builder for something it can't do yet:</p>
  <p style="margin:0 0 12px;padding:12px 14px;background:#f7f5ff;border:1px solid #e6e0fb;border-radius:10px;"><b>${escapeHtml(r.request)}</b></p>
  <p style="margin:0 0 4px;color:#475467;">Their message:</p>
  <p style="margin:0;color:#475467;white-space:pre-wrap;">${escapeHtml(r.ownerMessage.slice(0, 2000))}</p>
</div>`;
    await sendSequenceEmail({
      to: "stella@leadscoreai.com",
      subject: `Feature request: ${r.request.slice(0, 80)}`,
      html,
      apiKey,
      fromEmail: "hello@leadscoreai.com",
      fromName: "LeadScoreAI Builder",
    });
  } catch (e) {
    console.error("[builder] feature request error:", e);
  }
}
