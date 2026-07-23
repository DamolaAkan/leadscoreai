import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// POST /api/invoices/auth — login
export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: admin, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !admin) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Create session
  const sessionId = `adm-${Date.now()}-${crypto.randomBytes(16).toString("hex")}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await supabase.from("admin_sessions").insert({
    admin_id: admin.id,
    session_id: sessionId,
    expires_at: expiresAt.toISOString(),
  });

  return NextResponse.json({
    session_id: sessionId,
    user: { id: admin.id, email: admin.email, full_name: admin.full_name },
  });
}

// GET /api/invoices/auth — validate session (me)
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = authHeader.slice(7);
  const supabase = createServiceClient();

  const { data: session, error } = await supabase
    .from("admin_sessions")
    .select("*, admin:admin_users(*)")
    .eq("session_id", sessionId)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  if (new Date(session.expires_at) < new Date()) {
    await supabase.from("admin_sessions").delete().eq("id", session.id);
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const admin = session.admin;
  return NextResponse.json({
    id: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    role: admin.role || "rep",
  });
}

// DELETE /api/invoices/auth — logout
export async function DELETE(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = authHeader.slice(7);
  const supabase = createServiceClient();
  await supabase.from("admin_sessions").delete().eq("session_id", sessionId);

  return NextResponse.json({ success: true });
}
