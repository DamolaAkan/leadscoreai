import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendSequenceEmail } from "@/lib/email";
import { EMAIL_RE, getResendKey } from "@/lib/builder-server";

export const dynamic = "force-dynamic";

// Quiz builder sign-up / sign-in, step 1: email a 6-digit code to anyone.
// The account (org) is only created once the code is verified, so unverified
// emails never create rows in organizations.
export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({}));
  const norm = String(email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(norm) || norm.length > 200) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const { allowed } = await checkRateLimit(request, "builder_code", 10);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });
  }

  const supabase = createServiceClient();

  // One code per 30s per email.
  const { data: recent } = await supabase
    .from("builder_codes")
    .select("created_at")
    .eq("email", norm)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent && Date.now() - new Date(recent.created_at).getTime() < 30_000) {
    return NextResponse.json({ ok: true });
  }

  await supabase.from("builder_codes").update({ used: true }).eq("email", norm).eq("used", false);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const code_hash = await bcrypt.hash(code, 10);
  const { error } = await supabase.from("builder_codes").insert({
    email: norm,
    code_hash,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (error) {
    console.error("[builder/request-code] insert error:", error.message);
    return NextResponse.json({ error: "Could not send a code. Try again." }, { status: 500 });
  }

  const apiKey = await getResendKey();
  if (!apiKey) {
    console.error("[builder/request-code] no Resend key configured");
    return NextResponse.json({ error: "Email is not configured." }, { status: 500 });
  }
  const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:460px;margin:0 auto;color:#1f2533;">
  <div style="font-size:15px;line-height:1.6;">
    <p style="margin:0 0 12px;">Here's your code to start building your quiz on LeadScoreAI:</p>
    <div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#6d28d9;background:#f7f5ff;border:1px solid #e6e0fb;border-radius:12px;text-align:center;padding:16px 0;margin:0 0 12px;">${code}</div>
    <p style="margin:0 0 6px;color:#475467;">Enter it on the sign-in screen. It expires in 10 minutes.</p>
    <p style="margin:12px 0 0;color:#98a2b3;font-size:13px;">Didn't ask for this? You can ignore this email.</p>
  </div>
</div>`;
  await sendSequenceEmail({
    to: norm,
    subject: `Your LeadScoreAI code: ${code}`,
    html,
    apiKey,
    fromEmail: "hello@leadscoreai.com",
    fromName: "LeadScoreAI",
  });

  return NextResponse.json({ ok: true });
}
