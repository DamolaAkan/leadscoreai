import { createServiceClient } from "./supabase";
import { AuthUser } from "./dashboard-types";
import crypto from "crypto";

export function generateDashboardSessionId(): string {
  return `dash-${Date.now()}-${crypto.randomBytes(16).toString("hex")}`;
}

export async function validateSession(
  sessionId: string
): Promise<AuthUser | null> {
  if (!sessionId) return null;

  const supabase = createServiceClient();

  const { data: session, error: sessionError } = await supabase
    .from("org_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (sessionError || !session) return null;

  // Check expiry
  if (new Date(session.expires_at) < new Date()) {
    // Clean up expired session
    await supabase.from("org_sessions").delete().eq("id", session.id);
    return null;
  }

  const { data: member, error: memberError } = await supabase
    .from("org_members")
    .select("*")
    .eq("id", session.member_id)
    .single();

  if (memberError || !member || !member.is_active) return null;

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", member.organization_id)
    .single();

  if (orgError || !org) return null;

  return {
    memberId: member.id,
    organizationId: org.id,
    orgSlug: org.slug,
    orgName: org.name,
    primaryColor: org.primary_color,
    username: member.username,
    fullName: member.full_name,
    role: member.role,
  };
}

export function getSessionIdFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

export function hasRole(
  user: AuthUser,
  requiredRole: "staff" | "admin" | "superadmin"
): boolean {
  const hierarchy = { staff: 0, admin: 1, superadmin: 2 };
  return hierarchy[user.role] >= hierarchy[requiredRole];
}
