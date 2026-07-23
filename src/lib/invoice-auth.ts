import { createServiceClient } from "./supabase";

export type AdminRole = "rep" | "supervisor" | "super_admin";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
}

export function getAdminSessionFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

export async function validateAdminSession(sessionId: string): Promise<AdminUser | null> {
  if (!sessionId) return null;

  const supabase = createServiceClient();

  const { data: session, error } = await supabase
    .from("admin_sessions")
    .select("*, admin:admin_users(*)")
    .eq("session_id", sessionId)
    .single();

  if (error || !session) return null;

  if (new Date(session.expires_at) < new Date()) {
    await supabase.from("admin_sessions").delete().eq("id", session.id);
    return null;
  }

  const admin = session.admin;
  return {
    id: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    role: (admin.role as AdminRole) || "rep",
  };
}

// Resolve the admin user from a request, or null if unauthenticated.
export async function requireAdmin(request: Request): Promise<AdminUser | null> {
  const sessionId = getAdminSessionFromRequest(request);
  if (!sessionId) return null;
  return validateAdminSession(sessionId);
}

// A supervisor or super_admin can see all reps' data and approve commissions.
export function canManage(user: AdminUser): boolean {
  return user.role === "supervisor" || user.role === "super_admin";
}

// Only super_admins get the privileged tabs (Invoicing, Payouts).
export function isSuperAdmin(user: AdminUser): boolean {
  return user.role === "super_admin";
}
