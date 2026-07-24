import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin, isSuperAdmin } from "@/lib/invoice-auth";

export const dynamic = "force-dynamic";

// GET /api/team/[id] — full onboarding + profile for one staff member (super_admin only).
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServiceClient();
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id, full_name, email, role, created_at")
    .eq("id", params.id)
    .single();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: onboarding } = await supabase
    .from("staff_onboarding")
    .select("*")
    .eq("admin_id", params.id)
    .maybeSingle();
  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("admin_id", params.id)
    .maybeSingle();

  return NextResponse.json({ admin, onboarding: onboarding || null, profile: profile || null });
}
