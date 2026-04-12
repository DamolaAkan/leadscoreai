import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest, hasRole } from "@/lib/auth";

export async function GET(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await validateSession(sessionId);
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("org_members")
    .select("id, organization_id, username, full_name, role, is_active, last_login_at, created_at")
    .eq("organization_id", user.organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }

  return NextResponse.json({ members: data });
}

export async function POST(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await validateSession(sessionId);
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { username, fullName, password, role } = await request.json();

  if (!username || !fullName || !password || !role) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  // Admins can only create staff; superadmins can create staff or admin
  if (user.role === "admin" && role !== "staff") {
    return NextResponse.json(
      { error: "Admins can only create staff members" },
      { status: 403 }
    );
  }

  if (role === "superadmin") {
    return NextResponse.json(
      { error: "Cannot create superadmin users" },
      { status: 403 }
    );
  }

  const supabase = createServiceClient();

  // Check for existing username
  const { data: existing } = await supabase
    .from("org_members")
    .select("id")
    .eq("organization_id", user.organizationId)
    .eq("username", username)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Username already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { error } = await supabase.from("org_members").insert({
    organization_id: user.organizationId,
    username,
    full_name: fullName,
    password_hash: passwordHash,
    role,
    is_active: true,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to create member" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
