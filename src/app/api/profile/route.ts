import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/invoice-auth";

export const dynamic = "force-dynamic";

// GET /api/profile — own profile + identity fields for the card/ID.
export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("admin_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    profile: profile || null,
    admin: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
  });
}

// PUT /api/profile — upsert title + phone numbers.
export async function PUT(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = { admin_id: user.id, updated_at: new Date().toISOString() };
  for (const f of ["title", "phone_primary", "phone_secondary"]) {
    if (f in body) patch[f] = (body[f] || "").trim() || null;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("staff_profiles")
    .upsert(patch, { onConflict: "admin_id" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
