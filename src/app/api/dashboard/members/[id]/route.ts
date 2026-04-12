import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest, hasRole } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await validateSession(sessionId);
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const supabase = createServiceClient();

  // Fetch target member to check org membership and role
  const { data: target, error: targetError } = await supabase
    .from("org_members")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", user.organizationId)
    .single();

  if (targetError || !target) {
    return NextResponse.json(
      { error: "Member not found" },
      { status: 404 }
    );
  }

  // Prevent non-superadmins from modifying superadmins
  if (target.role === "superadmin" && user.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.is_active === "boolean") {
    updates.is_active = body.is_active;
  }

  if (body.role && ["staff", "admin"].includes(body.role)) {
    if (user.role !== "superadmin" && body.role === "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    updates.role = body.role;
  }

  if (body.newPassword) {
    updates.password_hash = await bcrypt.hash(body.newPassword, 12);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  const { error } = await supabase
    .from("org_members")
    .update(updates)
    .eq("id", params.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await validateSession(sessionId);
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cannot delete self
  if (params.id === user.memberId) {
    return NextResponse.json(
      { error: "Cannot delete yourself" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Check target belongs to same org
  const { data: target } = await supabase
    .from("org_members")
    .select("role")
    .eq("id", params.id)
    .eq("organization_id", user.organizationId)
    .single();

  if (!target) {
    return NextResponse.json(
      { error: "Member not found" },
      { status: 404 }
    );
  }

  if (target.role === "superadmin") {
    return NextResponse.json(
      { error: "Cannot delete superadmin" },
      { status: 403 }
    );
  }

  // Delete sessions first
  await supabase.from("org_sessions").delete().eq("member_id", params.id);

  const { error } = await supabase
    .from("org_members")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
