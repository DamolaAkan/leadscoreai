import { createServiceClient } from "./supabase";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
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
  return { id: admin.id, email: admin.email, full_name: admin.full_name };
}
