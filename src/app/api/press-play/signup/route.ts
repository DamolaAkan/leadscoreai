import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";
import { generateDashboardSessionId } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { EMAIL_RE, escapeLike, normalizeWhatsApp, uniqueOrgSlug, uniqueQuizSlug, waLink } from "@/lib/builder-server";
import { lagosNow, sendTeamAlert } from "@/lib/builder-emails";
import { track } from "@/lib/track";
import { clientSignals, metaCookies, sendMetaEvent } from "@/lib/meta-capi";
import { pressPlayEnabled } from "@/lib/wallet";
import { AREAS } from "@/lib/press-play-config";
import { MIN_JOB_OPTIONS, PRODUCT_OPTIONS, TEMPLATE_IDS, build, type TemplateId } from "@/lib/press-play-scorecards";

export const dynamic = "force-dynamic";

// Sign-up last step: check the emailed code, create (or sign in to) the
// installer's account, save their chosen scorecard live, and start a session.
export async function POST(request: Request) {
  if (!pressPlayEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || !body.code) {
    return NextResponse.json({ error: "Enter the code we emailed you." }, { status: 400 });
  }
  const { allowed } = await checkRateLimit(request, "press_play_signup", 20);
  if (!allowed) return NextResponse.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });

  const companyName = String(body.companyName || "").trim().slice(0, 80);
  const phone = normalizeWhatsApp(body.whatsapp);
  const products = (Array.isArray(body.products) ? body.products : []).filter((p: unknown) =>
    (PRODUCT_OPTIONS as readonly string[]).includes(String(p))
  );
  const cities = (Array.isArray(body.cities) ? body.cities : []).filter((c: unknown) => AREAS.some((a) => a.slug === c));
  const minJobNaira = (MIN_JOB_OPTIONS as readonly number[]).includes(Number(body.minJobNaira)) ? Number(body.minJobNaira) : 0;
  const templateId = (TEMPLATE_IDS as string[]).includes(body.templateId) ? (body.templateId as TemplateId) : "savings";
  if (!companyName || !phone || !cities.length) {
    return NextResponse.json({ error: "Add your company name, WhatsApp number and at least one city." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("builder_codes")
    .select("id, code_hash, expires_at")
    .eq("email", email)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row || !(await bcrypt.compare(String(body.code).trim(), row.code_hash))) {
    return NextResponse.json({ error: "That code isn't right." }, { status: 401 });
  }
  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: "That code expired. Request a new one." }, { status: 401 });
  }
  await supabase.from("builder_codes").update({ used: true }).eq("id", row.id);

  // An existing account with this email signs in; it's never duplicated.
  let { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .ilike("email", escapeLike(email))
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const isNew = !org;
  if (!org) {
    const { data: created, error } = await supabase
      .from("organizations")
      .insert({
        name: companyName,
        slug: await uniqueOrgSlug(companyName),
        email,
        primary_color: "#047857",
        is_active: true,
        signup_date: new Date().toISOString(),
        signup_source: "press_play",
        self_serve: true,
        phone,
        billing_currency: "NGN",
        country: "NG",
      })
      .select("id, name, slug")
      .single();
    if (error || !created) {
      console.error("[press-play/signup] org create error:", error?.message);
      return NextResponse.json({ error: "We couldn't create your account. Try again." }, { status: 500 });
    }
    org = created;
  }

  const { quiz, questions } = build({ companyName, products, cities, minJobNaira, whatsapp: phone }, templateId);
  const { data: savedQuiz, error: quizErr } = await supabase
    .from("quizzes")
    .insert({ ...quiz, organization_id: org.id, slug: await uniqueQuizSlug(org.id, "solar-quote") })
    .select("id, slug")
    .single();
  if (quizErr || !savedQuiz) {
    console.error("[press-play/signup] quiz create error:", quizErr?.message);
    return NextResponse.json({ error: "We couldn't save your scorecard. Try again." }, { status: 500 });
  }
  const { error: qErr } = await supabase.from("quiz_questions").insert(questions.map((q) => ({ ...q, quiz_id: savedQuiz.id })));
  if (qErr) {
    console.error("[press-play/signup] questions create error:", qErr.message);
    await supabase.from("quizzes").update({ is_active: false }).eq("id", savedQuiz.id);
    return NextResponse.json({ error: "We couldn't save your scorecard. Try again." }, { status: 500 });
  }

  const sessionId = generateDashboardSessionId();
  const { error: sessErr } = await supabase.from("org_sessions").insert({
    organization_id: org.id,
    member_id: null,
    username: email,
    full_name: org.name,
    role: "superadmin",
    session_id: sessionId,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (sessErr) return NextResponse.json({ error: "Could not sign you in. Try again." }, { status: 500 });

  await track(isNew ? "signed_up" : "signed_in", {
    orgId: org.id,
    props: { email, via: "press_play", template: templateId, cities, products },
    request,
  });
  if (isNew) {
    // Our own funnel's Lead (Siteflipmarket), the same as builder sign-ups.
    const sig = clientSignals(request);
    const { fbp, fbc } = metaCookies(request);
    await sendMetaEvent({
      eventName: "Lead",
      eventId: `signup_${org.id}`,
      email,
      externalId: org.id,
      contentName: "press_play_signup",
      eventSourceUrl: sig.eventSourceUrl,
      clientIp: sig.clientIp,
      userAgent: sig.userAgent,
      fbp,
      fbc,
    });
    await sendTeamAlert(`🆕 Press-play sign-up: ${org.name}`, [
      ["Business", org.name],
      ["Email", email],
      ["WhatsApp", waLink(phone)],
      ["Cities", cities.join(", ")],
      ["Scorecard", templateId],
      ["Signed up", lagosNow()],
      ["Dashboard slug", org.slug],
    ]);
  }

  return NextResponse.json({ session_id: sessionId, orgSlug: org.slug, isNew, quizSlug: savedQuiz.slug });
}
