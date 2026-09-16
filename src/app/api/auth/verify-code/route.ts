import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";
import { generateDashboardSessionId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Passwordless login step 2: verify the code and start a dashboard session.
export async function POST(request: Request) {
  const { orgSlug, email, code } = await request.json().catch(() => ({}));
  if (!orgSlug || !email || !code) {
    return NextResponse.json({ error: "Enter the code we emailed you." }, { status: 400 });
  }
  const norm = String(email).trim().toLowerCase();
  const supabase = createServiceClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, email, primary_color, logo_url")
    .eq("slug", orgSlug)
    .eq("is_active", true)
    .single();
  if (!org) return NextResponse.json({ error: "Invalid code" }, { status: 401 });

  const { data: row } = await supabase
    .from("org_login_codes")
    .select("id, code_hash, expires_at, used")
    .eq("organization_id", org.id)
    .eq("email", norm)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: "That code expired — request a new one." }, { status: 401 });
  }
  const valid = await bcrypt.compare(String(code).trim(), row.code_hash);
  if (!valid) return NextResponse.json({ error: "Invalid code" }, { status: 401 });

  // Burn the code and open a session (member-less: identity comes from the session).
  await supabase.from("org_login_codes").update({ used: true }).eq("id", row.id);

  const sessionId = generateDashboardSessionId();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  const { error: sessErr } = await supabase.from("org_sessions").insert({
    organization_id: org.id,
    member_id: null,
    username: org.email,
    full_name: org.name,
    role: "superadmin",
    session_id: sessionId,
    expires_at: expiresAt,
  });
  if (sessErr) return NextResponse.json({ error: "Could not start session" }, { status: 500 });

  return NextResponse.json({
    session_id: sessionId,
    user: { memberId: null, username: org.email, fullName: org.name, role: "superadmin" },
  });
}
