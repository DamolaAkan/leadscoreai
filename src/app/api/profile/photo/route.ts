import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/invoice-auth";

export const dynamic = "force-dynamic";

// POST /api/profile/photo — upload a passport photo (base64 data URL) to storage,
// store the public URL on the profile.
export async function POST(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const dataUrl: string = body.dataUrl || "";
  const m = dataUrl.match(/^data:(image\/(png|jpe?g|webp));base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "Please upload a PNG, JPG or WebP image." }, { status: 400 });

  const contentType = m[1];
  const ext = m[2] === "jpeg" ? "jpg" : m[2];
  const buffer = Buffer.from(m[3], "base64");
  if (buffer.length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image is too large (max 5MB)." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const path = `${user.id}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("staff-photos")
    .upload(path, buffer, { contentType, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = supabase.storage.from("staff-photos").getPublicUrl(path);
  // Cache-bust so a re-upload shows immediately.
  const photoUrl = `${pub.publicUrl}?v=${Date.now()}`;

  const { error } = await supabase
    .from("staff_profiles")
    .upsert({ admin_id: user.id, photo_url: photoUrl, updated_at: new Date().toISOString() }, { onConflict: "admin_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ photo_url: photoUrl });
}
