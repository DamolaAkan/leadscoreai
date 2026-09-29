import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";
import { generateDashboardSessionId } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { EMAIL_RE, escapeLike, normalizeWhatsApp, uniqueOrgSlug, waLink } from "@/lib/builder-server";
import { lagosNow, sendOwnerEmailOnce, sendTeamAlert } from "@/lib/builder-emails";
import { attributeVisitor, describeFirstTouch, sanitizeFirstTouch, track } from "@/lib/track";
import { clientSignals, metaCookies, sendMetaEvent } from "@/lib/meta-capi";
import { describeAnswers, sanitizeAnswers, scoreAnswers } from "@/lib/signup-scorecard";

export const dynamic = "force-dynamic";

// Quiz builder step 2: verify the code, then sign in to the business that owns
// this email, or create a new one (on the free trial) if there isn't one.
export async function POST(request: Request) {
  const { email, code, businessName, whatsapp, loginOnly, visitorId, firstTouch, onboarding } = await request.json().catch(() => ({}));
  const phone = normalizeWhatsApp(whatsapp);
  // Sign-up scorecard answers (six taps before the details), if they took it.
  const scorecard = sanitizeAnswers(onboarding);
  const fit = scorecard ? scoreAnswers(scorecard) : null;
  const ft = sanitizeFirstTouch(firstTouch);
  const norm = String(email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(norm) || !code) {
    return NextResponse.json({ error: "Enter the code we emailed you." }, { status: 400 });
  }

  const { allowed } = await checkRateLimit(request, "builder_verify", 20);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });
  }

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("builder_codes")
    .select("id, code_hash, expires_at")
    .eq("email", norm)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: "That code expired. Request a new one." }, { status: 401 });
  }
  const valid = await bcrypt.compare(String(code).trim(), row.code_hash);
  if (!valid) return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  await supabase.from("builder_codes").update({ used: true }).eq("id", row.id);

  // Existing business with this email (including accounts Stella onboarded)?
  let { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, phone")
    .ilike("email", escapeLike(norm))
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // /login signs existing accounts in; it never creates one.
  if (!org && loginOnly) {
    await track("login_no_account", { visitorId, props: { email: norm }, request });
    return NextResponse.json(
      { error: "No LeadScoreAI account uses this email yet.", noAccount: true },
      { status: 404 }
    );
  }

  let isNewAccount = false;
  if (!org) {
    isNewAccount = true;
    const name = String(businessName || "").trim().slice(0, 80) || norm.split("@")[0];
    const slug = await uniqueOrgSlug(name);
    const { data: created, error } = await supabase
      .from("organizations")
      .insert({
        name,
        slug,
        email: norm,
        primary_color: "#7C3AED",
        is_active: true,
        billing_tier: "trial", // trial lock applies (10 real leads or 30 days)
        signup_date: new Date().toISOString(),
        signup_source: "builder",
        self_serve: true,
        phone,
      })
      .select("id, name, slug, phone")
      .single();
    if (error || !created) {
      console.error("[builder/verify-code] org create error:", error?.message);
      return NextResponse.json({ error: "Could not create your account. Try again." }, { status: 500 });
    }
    org = created;
  } else if (phone && !org.phone) {
    // Existing account signing up again from a landing page: keep the number.
    await supabase.from("organizations").update({ phone }).eq("id", org.id);
  }

  const sessionId = generateDashboardSessionId();
  const { error: sessErr } = await supabase.from("org_sessions").insert({
    organization_id: org.id,
    member_id: null,
    username: norm,
    full_name: org.name,
    role: "superadmin",
    session_id: sessionId,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (sessErr) return NextResponse.json({ error: "Could not start session" }, { status: 500 });

  // Activity log: new account (with where they came from) or a returning sign-in.
  const { fbp, fbc } = metaCookies(request);
  await track(isNewAccount ? "signed_up" : "signed_in", {
    orgId: org.id,
    visitorId,
    props: {
      email: norm,
      via: loginOnly ? "login" : "builder",
      ...(isNewAccount ? { fbp, fbc } : {}),
      ...(isNewAccount && ft ? { first_touch: ft } : {}),
      ...(isNewAccount && scorecard && fit ? { scorecard, fit_score: fit.score, fit_band: fit.band } : {}),
    },
    request,
  });

  // Meta (Siteflipmarket dataset): a new self-serve account is the ad "Lead".
  // The browser pixel fires the same event id, so Meta counts it once.
  const metaEventId = isNewAccount ? `signup_${org.id}` : null;
  if (metaEventId) {
    const sig = clientSignals(request);
    await sendMetaEvent({
      eventName: "Lead",
      eventId: metaEventId,
      email: norm,
      externalId: org.id,
      contentName: "quiz_builder_signup",
      eventSourceUrl: sig.eventSourceUrl,
      clientIp: sig.clientIp,
      userAgent: sig.userAgent,
      fbp,
      fbc,
    });
  }
  // A Hot/Warm sign-up (from the sign-up scorecard) also fires a QualifiedLead
  // event, so we can tell Meta to optimise our ads toward buyers who qualify,
  // not just anyone who signs up. Server-only; carries the ad click id (fbc).
  if (isNewAccount && fit && (fit.band === "Hot" || fit.band === "Warm")) {
    const sig = clientSignals(request);
    await sendMetaEvent({
      eventName: "QualifiedLead",
      eventId: `qlead_${org.id}`,
      email: norm,
      externalId: org.id,
      contentName: `quiz_builder_qualified_${fit.band.toLowerCase()}`,
      eventSourceUrl: sig.eventSourceUrl,
      clientIp: sig.clientIp,
      userAgent: sig.userAgent,
      fbp,
      fbc,
    });
  }
  await attributeVisitor(visitorId, org.id);

  // New self-serve account: welcome the owner, tell the team.
  if (isNewAccount) {
    await Promise.all([
      sendOwnerEmailOnce("welcome", { id: org.id, name: org.name, slug: org.slug, email: norm }, { hasQuiz: false, offerEndsAt: null }),
      sendTeamAlert(`🆕 New self-serve sign-up: ${org.name}`, [
        ["Business", org.name],
        ["Email", norm],
        ["WhatsApp", phone ? waLink(phone) : "Not given"],
        ["Signed up", lagosNow()],
        ["Came from", describeFirstTouch(ft)],
        ["Scorecard", fit ? `${fit.band} · ${fit.score}/100` : "Skipped"],
        ...(scorecard ? describeAnswers(scorecard).map((line): [string, string] => ["Answer", line]) : []),
        ["Dashboard slug", org.slug],
      ]),
    ]);
  }

  return NextResponse.json({ session_id: sessionId, orgSlug: org.slug, orgName: org.name, isNew: isNewAccount, metaEventId });
}
