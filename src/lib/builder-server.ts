import { NextResponse } from "next/server";
import { createServiceClient } from "./supabase";
import { validateSession, getSessionIdFromRequest } from "./auth";
import { decrypt } from "./encryption";
import { RESERVED_SLUGS, slugify } from "./builder";
import type { AuthUser } from "./dashboard-types";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
