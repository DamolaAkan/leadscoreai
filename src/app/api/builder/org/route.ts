import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireBuilderUser } from "@/lib/builder-server";

export const dynamic = "force-dynamic";

// Brand settings the owner can change from the builder: business name + colour.
export async function PATCH(request: Request) {
  const auth = await requireBuilderUser(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const body = await request.json().catch(() => ({}));
  const update: Record<string, string> = {};
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim().slice(0, 80);
  if (typeof body.primary_color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.primary_color)) {
    update.primary_color = body.primary_color;
  }
  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("organizations")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", user.organizationId);
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  return NextResponse.json({ ok: true, ...update });
}
