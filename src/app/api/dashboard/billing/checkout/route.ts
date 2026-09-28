import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest, hasRole } from "@/lib/auth";
import { initTransaction, paystackConfigured, TIERS, Tier, plansFor, goLiveOffer, OrgBilling, tierPriceFor } from "@/lib/paystack";
import { firstBuilderQuizAt } from "@/lib/go-live";
import { track } from "@/lib/track";
import { lagosNow, sendTeamAlert } from "@/lib/builder-emails";
import { clientSignals, metaCookies, sendMetaEvent } from "@/lib/meta-capi";

export const dynamic = "force-dynamic";

// Starts a Paystack checkout for the chosen plan. Only a superadmin of the org
// can subscribe. Returns the authorization_url for the client to redirect to.
export async function POST(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await validateSession(sessionId);
  if (!user || !hasRole(user, "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!paystackConfigured()) {
    return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const tier = body.tier as Tier;
  if (!TIERS[tier] || !plansFor(user.selfServe).includes(tier)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, email, self_serve, signup_date, last_paid_at")
    .eq("id", user.organizationId)
    .single();
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  // Paystack rejects placeholder/demo domains, so pick the first genuinely valid
  // email: the org's billing email, else the logged-in user's.
  const realEmail = (e?: string | null): e is string => {
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
    const domain = e.split("@")[1].toLowerCase();
    if (/\.(example|test|invalid|localhost)$/.test(domain)) return false;
    if (["example.com", "example.org", "example.net"].includes(domain)) return false;
    return true;
  };
  const email = realEmail(org.email) ? org.email : realEmail(user.username) ? user.username : null;
  if (!email) {
    return NextResponse.json(
      { error: "Add a valid billing email in Settings first." },
      { status: 400 }
    );
  }

  // Optional: the builder quiz to put live as soon as this payment succeeds.
  let publishQuizId: string | null = null;
  if (typeof body.quizId === "string") {
    const { data: q } = await supabase
      .from("quizzes")
      .select("id")
      .eq("id", body.quizId)
      .eq("organization_id", org.id)
      .not("builder_config", "is", null)
      .maybeSingle();
    publishQuizId = q?.id ?? null;
  }

  const origin = new URL(request.url).origin;
  const callbackUrl = `${origin}/dashboard/${org.slug}?billing=success${publishQuizId ? "&tab=builder" : ""}`;

  let init;
  const priceNaira = tierPriceFor(tier, org);
  let amountNaira: number = priceNaira;
  try {
    const firstQuizAt = org.self_serve ? await firstBuilderQuizAt(org.id) : null;
    const offer = goLiveOffer(org as OrgBilling, firstQuizAt);
    amountNaira = priceNaira - offer.discount;
    init = await initTransaction({
      email,
      tier,
      priceNaira,
      orgId: org.id,
      callbackUrl,
      discountNaira: offer.discount,
      publishQuizId,
    });
  } catch (e) {
    console.error("[billing/checkout] paystack unreachable:", e);
    return NextResponse.json({ error: "Payment provider unreachable — please try again." }, { status: 502 });
  }
  if (!init?.status || !init?.data?.authorization_url) {
    console.error("[billing/checkout] paystack init failed:", init?.message);
    return NextResponse.json({ error: init?.message || "Could not start checkout." }, { status: 502 });
  }
  const reference: string = init.data.reference || "";
  const { fbp, fbc } = metaCookies(request);
  await track("checkout_started", {
    orgId: org.id,
    quizId: publishQuizId,
    props: { tier, amount_naira: amountNaira, reference, fbp, fbc },
    request,
  });

  // Heads-up for the team on every self-serve checkout, paid or not, so Stella
  // can follow up if no payment alert comes after it.
  if (org.self_serve) {
    await sendTeamAlert(`🛒 Checkout opened: ${org.name ?? email}`, [
      ["Business", org.name ?? ""],
      ["Email", email],
      ["Amount", `₦${amountNaira.toLocaleString("en-NG")}${amountNaira < priceNaira ? ` (₦${(priceNaira - amountNaira).toLocaleString("en-NG")} go-live discount)` : ""}`],
      ["Going live with", publishQuizId ? "A quiz is waiting to publish" : "No quiz picked"],
      ["Reference", reference],
      ["When", lagosNow()],
      ["Next", "Not paid yet. If no 💰 payment alert follows, reach out."],
    ]);
  }

  // Meta (Siteflipmarket dataset): InitiateCheckout for self-serve owners, with
  // the same event id the browser pixel fires so Meta counts it once.
  const metaEventId = reference ? `checkout_${reference}` : "";
  if (org.self_serve && metaEventId) {
    const sig = clientSignals(request);
    await sendMetaEvent({
      eventName: "InitiateCheckout",
      eventId: metaEventId,
      email,
      externalId: org.id,
      value: amountNaira,
      currency: "NGN",
      eventSourceUrl: sig.eventSourceUrl,
      clientIp: sig.clientIp,
      userAgent: sig.userAgent,
      fbp,
      fbc,
    });
  }
  return NextResponse.json({ authorization_url: init.data.authorization_url, reference, amountNaira, metaEventId });
}
