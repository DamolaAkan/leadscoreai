import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendSequenceEmail } from "@/lib/email";
import { EMAIL_RE, getResendKey } from "@/lib/builder-server";
import { partnerCodeKey } from "@/lib/partners";

export const dynamic = "force-dynamic";

// Partner sign-up or sign-in: emails a 6-digit code. Sign-up checks the details
// first, including the Naira payout confirmation for partners outside Nigeria.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const norm = String(body.email || "").trim().toLowerCase();
  const signup = body.purpose === "signup";
  if (!EMAIL_RE.test(norm) || norm.length > 200) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const { allowed } = await checkRateLimit(request, "partner_code", 10);
  if (!allowed) return NextResponse.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });

  const supabase = createServiceClient();
  const { data: existing } = await supabase.from("partners").select("id, status").eq("email", norm).maybeSingle();
  if (existing?.status === "disabled") {
    return NextResponse.json({ error: "This partner account is paused. Contact us on WhatsApp." }, { status: 403 });
  }
  if (!signup && !existing) {
    return NextResponse.json({ error: "No partner account uses this email yet. Sign up instead." }, { status: 404 });
  }
  if (signup && !existing) {
    const name = String(body.full_name || "").trim();
    const whatsapp = String(body.whatsapp || "").trim();
    const country = String(body.country || "");
    if (name.length < 2) return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
    if (whatsapp.replace(/\D/g, "").length < 7) return NextResponse.json({ error: "Enter your WhatsApp number." }, { status: 400 });
    if (!/^[A-Z]{2}$/.test(country)) return NextResponse.json({ error: "Choose your country." }, { status: 400 });
    if (country !== "NG" && body.confirmed_ngn !== true) {
      return NextResponse.json({ error: "Confirm you can receive Naira payouts into a Nigerian bank account." }, { status: 400 });
    }
  }

  const key = partnerCodeKey(norm);
  const { data: recent } = await supabase
    .from("builder_codes")
    .select("created_at")
    .eq("email", key)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent && Date.now() - new Date(recent.created_at).getTime() < 30_000) return NextResponse.json({ ok: true });

  await supabase.from("builder_codes").update({ used: true }).eq("email", key).eq("used", false);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const { error } = await supabase.from("builder_codes").insert({
    email: key,
    code_hash: await bcrypt.hash(code, 10),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (error) {
    console.error("[partners/request-code] insert error:", error.message);
    return NextResponse.json({ error: "Could not send a code. Try again." }, { status: 500 });
  }

  const apiKey = await getResendKey();
  if (!apiKey) return NextResponse.json({ error: "Email is not configured." }, { status: 500 });
  await sendSequenceEmail({
    to: norm,
    subject: `Your LeadScoreAI partner code: ${code}`,
    html: `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:460px;margin:0 auto;color:#1f2533;">
  <div style="font-size:15px;line-height:1.6;">
    <p style="margin:0 0 12px;">Here's your code for the LeadScoreAI partner dashboard:</p>
    <div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#6d28d9;background:#f7f5ff;border:1px solid #e6e0fb;border-radius:12px;text-align:center;padding:16px 0;margin:0 0 12px;">${code}</div>
    <p style="margin:0 0 6px;color:#475467;">Enter it on the partner page. It expires in 10 minutes.</p>
    <p style="margin:12px 0 0;color:#98a2b3;font-size:13px;">Didn't ask for this? You can ignore this email.</p>
  </div>
</div>`,
    apiKey,
    fromEmail: "hello@leadscoreai.com",
    fromName: "LeadScoreAI",
  });
  return NextResponse.json({ ok: true });
}
