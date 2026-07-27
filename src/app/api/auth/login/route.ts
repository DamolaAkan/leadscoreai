import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";
import { generateDashboardSessionId } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { orgSlug, username, password } = await request.json();

    if (!orgSlug || !username || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .single();

    console.log("[login] org lookup:", { orgSlug, orgId: org?.id, orgError: orgError?.message });

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const { data: member } = await supabase
      .from("org_members")
      .select("*")
      .eq("organization_id", org.id)
      .eq("username", username)
      .eq("is_active", true)
      .single();

    const sessionId = generateDashboardSessionId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // 1) Normal org-member login
    if (member && (await bcrypt.compare(password, member.password_hash))) {
      const { error: sessionError } = await supabase.from("org_sessions").insert({
        organization_id: org.id,
        member_id: member.id,
        username: member.username,
        full_name: member.full_name,
        role: member.role,
        session_id: sessionId,
        expires_at: expiresAt,
      });
      if (sessionError) {
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
      }
      await supabase
        .from("org_members")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", member.id);
      return NextResponse.json({
        session_id: sessionId,
        user: {
          memberId: member.id,
          username: member.username,
          fullName: member.full_name,
          role: member.role,
        },
      });
    }

    // 2) Staff override — any active LeadScoreAI staff account can sign in to
    //    ANY dashboard using their staff email + password.
    const { data: staff } = await supabase
      .from("admin_users")
      .select("id, email, full_name, role, password_hash")
      .ilike("email", username)
      .single();

    if (staff && (await bcrypt.compare(password, staff.password_hash))) {
      const dashRole = staff.role === "super_admin" ? "superadmin" : "admin";
      const { error: sessionError } = await supabase.from("org_sessions").insert({
        organization_id: org.id,
        member_id: null, // staff have no org_members row; null marks a staff session
        username: staff.email,
        full_name: staff.full_name,
        role: dashRole,
        session_id: sessionId,
        expires_at: expiresAt,
      });
      if (sessionError) {
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
      }
      return NextResponse.json({
        session_id: sessionId,
        user: {
          memberId: null,
          username: staff.email,
          fullName: staff.full_name,
          role: dashRole,
        },
      });
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (err) {
    console.error("[login] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
