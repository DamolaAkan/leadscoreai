import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin, isSuperAdmin } from "@/lib/invoice-auth";

export const dynamic = "force-dynamic";

// GET /api/team — every staff member with onboarding status + profile (super_admin only).
export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServiceClient();
  const { data: admins } = await supabase
    .from("admin_users")
    .select("id, full_name, email, role, created_at")
    .order("created_at");

  const { data: onboarding } = await supabase
    .from("staff_onboarding")
    .select("admin_id, status, submitted_at, updated_at");
  const { data: profiles } = await supabase
    .from("staff_profiles")
    .select("admin_id, staff_no, title, photo_url");

  const oMap = new Map((onboarding || []).map((o) => [o.admin_id, o]));
  const pMap = new Map((profiles || []).map((p) => [p.admin_id, p]));

  const team = (admins || []).map((a) => ({
    id: a.id,
    full_name: a.full_name,
    email: a.email,
    role: a.role,
    created_at: a.created_at,
    onboarding_status: oMap.get(a.id)?.status || "not_started",
    submitted_at: oMap.get(a.id)?.submitted_at || null,
    title: pMap.get(a.id)?.title || null,
    staff_no: pMap.get(a.id)?.staff_no || null,
    photo_url: pMap.get(a.id)?.photo_url || null,
  }));

  return NextResponse.json({ team });
}
