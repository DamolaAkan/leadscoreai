import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/invoice-auth";
import { decrypt } from "@/lib/encryption";
import { sendSequenceEmail } from "@/lib/email";
import { TIERS, FREE_LEAD_LIMIT, TRIAL_DAYS } from "@/lib/paystack";

export const dynamic = "force-dynamic";

// Staff onboarding console (Stella): list client orgs and approve/activate them.
// Activating sets the signup_date (which starts the 30-day trial clock) and emails
// the client an "account activated" note.

// GET — list orgs with their onboarding + trial status.
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, slug, email, billing_tier, billing_status, signup_date, created_at, is_active")
    .order("created_at", { ascending: false });

  const rows = (orgs || [])
    // Only trial/free clients need onboarding sign-off; skip grandfathered/paid/demo.
    .filter((o) => o.billing_tier === "trial" || o.billing_tier === "free")
    .map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      email: o.email,
      tier: o.billing_tier,
      signupDate: o.signup_date ?? null,
      onboarded: !!o.signup_date,
      createdAt: o.created_at,
    }));

  return NextResponse.json({ orgs: rows });
}

// POST — approve onboarding & activate. Body: { orgId, signupDate? }.
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const orgId = body.orgId as string;
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  // Default the signup date to now; allow staff to backdate/choose a specific day.
  const signupDate = body.signupDate ? new Date(body.signupDate) : new Date();
  if (isNaN(signupDate.getTime())) {
    return NextResponse.json({ error: "Invalid signupDate" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .update({ signup_date: signupDate.toISOString() })
    .eq("id", orgId)
    .select("id, name, slug, email")
    .single();
  if (orgErr || !org) {
    return NextResponse.json({ error: "Could not activate — is the signup_date column added?" }, { status: 500 });
  }

  // Send the "account activated" email to the client (best-effort — activation
  // still succeeds even if the email can't go out).
  let emailStatus: "sent" | "skipped" | "failed" = "skipped";
  const to = (org.email || "").trim();
  if (to && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    const { data: features } = await supabase
      .from("org_features")
      .select("resend_api_key")
      .not("resend_api_key", "is", null)
      .limit(1)
      .single();
    const apiKey = features?.resend_api_key ? decrypt(features.resend_api_key) : process.env.RESEND_API_KEY;
    if (apiKey) {
      const origin = new URL(request.url).origin;
      const scorecardUrl = `${origin}/${org.slug}/savings-check`;
      const loginUrl = `${origin}/dashboard/${org.slug}/login`;
      const trialEnds = new Date(signupDate.getTime() + TRIAL_DAYS * 24 * 3600 * 1000);
      const trialEndsStr = trialEnds.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2533;">
  <div style="background:linear-gradient(135deg,#7C3AED,#6d28d9);border-radius:14px;padding:22px 24px;color:#fff;">
    <div style="font-size:20px;font-weight:700;">🎉 Your ${org.name} account is activated</div>
  </div>
  <div style="padding:22px 4px;font-size:15px;line-height:1.65;">
    <p style="margin:0 0 14px;">Hi ${org.name},</p>
    <p style="margin:0 0 14px;">Welcome aboard — onboarding is complete and your LeadScoreAI account is now live.</p>
    <p style="margin:0 0 8px;"><b>Your scorecard is live:</b><br><a href="${scorecardUrl}" style="color:#7C3AED;">${scorecardUrl}</a></p>
    <p style="margin:0 0 8px;"><b>Your dashboard:</b><br><a href="${loginUrl}" style="color:#7C3AED;">${loginUrl}</a></p>
    <p style="margin:14px 0;">Your first <b>${FREE_LEAD_LIMIT} leads</b> are scored free (or <b>${TRIAL_DAYS} days</b>, until <b>${trialEndsStr}</b>) — after that it's ₦${TIERS.core.naira.toLocaleString()}/month to keep it running. Cancel anytime.</p>
    <p style="margin:14px 0 0;color:#667085;">— The LeadScoreAI team</p>
  </div>
</div>`;
      const res = await sendSequenceEmail({
        to,
        cc: ["stella@leadscoreai.com", "akanbi@leadscoreai.com"],
        subject: `Your ${org.name} account is activated 🎉`,
        html,
        apiKey,
        fromEmail: "hello@leadscoreai.com",
        fromName: "LeadScoreAI",
      });
      emailStatus = res.error ? "failed" : "sent";
    }
  }

  return NextResponse.json({
    success: true,
    signupDate: signupDate.toISOString(),
    emailStatus,
    activatedBy: admin.full_name,
  });
}
