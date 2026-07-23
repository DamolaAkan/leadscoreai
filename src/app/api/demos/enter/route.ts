import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/invoice-auth";
import { generateDashboardSessionId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/demos/enter — one-click auto-login for a DEMO org (staff only).
// Mints a short-lived org_session for a member of the demo org and returns it;
// the client stores it under "lsai-session" and lands in the dashboard.
export async function POST(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const slug = (body.slug || "").trim();
  if (!slug) return NextResponse.json({ error: "Missing org" }, { status: 400 });

  const supabase = createServiceClient();

  // Only demo orgs can be entered this way — never a real client tenant.
  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, is_demo")
    .eq("slug", slug)
    .single();
  if (!org || !org.is_demo) {
    return NextResponse.json({ error: "Not a demo organisation" }, { status: 403 });
  }

  // Prefer an admin/superadmin member so the demo shows the full dashboard.
  const { data: members } = await supabase
    .from("org_members")
    .select("id, username, full_name, role")
    .eq("organization_id", org.id)
    .eq("is_active", true);
  if (!members || members.length === 0) {
    return NextResponse.json({ error: "This demo has no active members" }, { status: 400 });
  }
  const rank = (r: string) => (r === "superadmin" ? 2 : r === "admin" ? 1 : 0);
  const member = [...members].sort((a, b) => rank(b.role) - rank(a.role))[0];

  const sessionId = generateDashboardSessionId();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("org_sessions").insert({
    organization_id: org.id,
    member_id: member.id,
    username: member.username,
    full_name: member.full_name,
    role: member.role,
    session_id: sessionId,
    expires_at: expiresAt,
  });
  if (error) return NextResponse.json({ error: "Could not start demo session" }, { status: 500 });

  return NextResponse.json({ session_id: sessionId, slug: org.slug });
}
