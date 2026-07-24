import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/invoice-auth";
import { ONBOARDING_FIELDS } from "@/lib/staff-types";

export const dynamic = "force-dynamic";

// GET /api/onboarding — the current staff member's own onboarding record.
export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("staff_onboarding")
    .select("*")
    .eq("admin_id", user.id)
    .maybeSingle();

  return NextResponse.json({ onboarding: data || null, me: { full_name: user.full_name, email: user.email } });
}

// PUT /api/onboarding — upsert own fields; pass { submit: true } to lock it in.
export async function PUT(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = { admin_id: user.id, updated_at: new Date().toISOString() };

  for (const f of ONBOARDING_FIELDS) {
    if (f in body) {
      const v = body[f];
      if (f.startsWith("ack_")) patch[f] = !!v;
      else patch[f] = typeof v === "string" ? v.trim() || null : v ?? null;
    }
  }

  if (body.submit) {
    if (!body.ack_employment || !body.ack_nda || !body.ack_conduct || !body.ack_privacy) {
      return NextResponse.json(
        { error: "Please tick all four acknowledgements before submitting." },
        { status: 400 }
      );
    }
    patch.status = "submitted";
    patch.submitted_at = new Date().toISOString();
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("staff_onboarding")
    .upsert(patch, { onConflict: "admin_id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ onboarding: data });
}
