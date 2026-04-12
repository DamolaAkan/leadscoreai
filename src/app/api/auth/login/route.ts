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

    const { data: member, error: memberError } = await supabase
      .from("org_members")
      .select("*")
      .eq("organization_id", org.id)
      .eq("username", username)
      .eq("is_active", true)
      .single();

    console.log("[login] member lookup:", {
      username,
      orgId: org.id,
      found: !!member,
      memberError: memberError?.message,
      hasHash: !!member?.password_hash,
      hashLength: member?.password_hash?.length,
    });

    if (memberError || !member) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, member.password_hash);
    console.log("[login] bcrypt compare result:", { valid });

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create session (24h expiry)
    const sessionId = generateDashboardSessionId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: sessionError } = await supabase
      .from("org_sessions")
      .insert({
        organization_id: org.id,
        member_id: member.id,
        username: member.username,
        full_name: member.full_name,
        role: member.role,
        session_id: sessionId,
        expires_at: expiresAt,
      });

    if (sessionError) {
      console.log("[login] session create error:", sessionError.message);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Update last_login_at
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
  } catch (err) {
    console.error("[login] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
