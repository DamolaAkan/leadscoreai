import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";
import { decrypt } from "@/lib/encryption";
import { sendSequenceEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Passwordless login step 1: email a one-time 6-digit code to the client.
// The code is only sent if the email matches the org's email on file — but we
// always return { ok: true } so the endpoint can't be used to probe who's registered.
export async function POST(request: Request) {
  const { orgSlug, email } = await request.json().catch(() => ({}));
  if (!orgSlug || !email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const norm = String(email).trim().toLowerCase();
  const supabase = createServiceClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, email")
    .eq("slug", orgSlug)
    .eq("is_active", true)
    .single();

  const ok = NextResponse.json({ ok: true });
  if (!org) return ok;
  const orgEmail = (org.email || "").trim().toLowerCase();
  if (!orgEmail || orgEmail !== norm) return ok; // don't reveal mismatch

  // Throttle: one code per 30s per org+email.
  const { data: recent } = await supabase
    .from("org_login_codes")
    .select("created_at")
    .eq("organization_id", org.id)
    .eq("email", norm)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent && Date.now() - new Date(recent.created_at).getTime() < 30_000) return ok;

  // Invalidate any prior unused codes, then issue a fresh one.
  await supabase
    .from("org_login_codes")
    .update({ used: true })
    .eq("organization_id", org.id)
    .eq("email", norm)
    .eq("used", false);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const code_hash = await bcrypt.hash(code, 10);
  await supabase.from("org_login_codes").insert({
    organization_id: org.id,
    email: norm,
    code_hash,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  const { data: features } = await supabase
    .from("org_features")
    .select("resend_api_key")
    .not("resend_api_key", "is", null)
    .limit(1)
    .single();
  const apiKey = features?.resend_api_key ? decrypt(features.resend_api_key) : process.env.RESEND_API_KEY;
  if (apiKey) {
    const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:460px;margin:0 auto;color:#1f2533;">
  <div style="font-size:15px;line-height:1.6;">
    <p style="margin:0 0 12px;">Here's your login code for the <b>${org.name}</b> dashboard:</p>
    <div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#6d28d9;background:#f7f5ff;border:1px solid #e6e0fb;border-radius:12px;text-align:center;padding:16px 0;margin:0 0 12px;">${code}</div>
    <p style="margin:0 0 6px;color:#475467;">Enter it on the login screen. It expires in 10 minutes.</p>
    <p style="margin:12px 0 0;color:#98a2b3;font-size:13px;">Didn't try to sign in? You can ignore this email.</p>
  </div>
</div>`;
    await sendSequenceEmail({
      to: orgEmail,
      subject: `Your ${org.name} login code: ${code}`,
      html,
      apiKey,
      fromEmail: "hello@leadscoreai.com",
      fromName: "LeadScoreAI",
    });
  }

  return ok;
}
