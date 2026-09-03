import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest, hasRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/dashboard/settings/logo — a client uploads their own logo (base64
// data URL) from their dashboard. Stored in the public org-logos bucket; the
// URL is saved on the organization and shows on their scorecard.
export async function POST(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await validateSession(sessionId);
  if (!user || !hasRole(user, "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const dataUrl: string = body.dataUrl || "";
  const m = dataUrl.match(/^data:(image\/(png|jpe?g|webp|svg\+xml));base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "Please upload a PNG, JPG, WebP or SVG image." }, { status: 400 });

  const contentType = m[1];
  const extMap: Record<string, string> = { png: "png", jpeg: "jpg", jpg: "jpg", webp: "webp", "svg+xml": "svg" };
  const ext = extMap[m[2]] || "png";
  const buffer = Buffer.from(m[3], "base64");
  if (buffer.length > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "Logo is too large (max 3MB)." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const path = `${user.organizationId}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("org-logos")
    .upload(path, buffer, { contentType, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = supabase.storage.from("org-logos").getPublicUrl(path);
  const logoUrl = `${pub.publicUrl}?v=${Date.now()}`; // cache-bust re-uploads

  const { error } = await supabase
    .from("organizations")
    .update({ logo_url: logoUrl })
    .eq("id", user.organizationId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logo_url: logoUrl });
}

// DELETE — remove the logo (fall back to the name/initial on the scorecard).
export async function DELETE(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await validateSession(sessionId);
  if (!user || !hasRole(user, "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("organizations")
    .update({ logo_url: null })
    .eq("id", user.organizationId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
