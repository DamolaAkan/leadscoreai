import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest, hasRole } from "@/lib/auth";
import { initTransaction, paystackConfigured, TIERS, Tier, plansFor, goLiveOffer, OrgBilling, tierPriceFor, currencyFor } from "@/lib/paystack";
import { money } from "@/lib/money";
import { createSubscriptionCheckout, stripeConfigured, stripeDiagnostics } from "@/lib/stripe";
import { firstBuilderQuizAt } from "@/lib/go-live";
import { track } from "@/lib/track";
import { lagosNow, sendTeamAlert } from "@/lib/builder-emails";
import { waLink } from "@/lib/builder-server";
import { clientSignals, metaCookies, sendMetaEvent } from "@/lib/meta-capi";

export const dynamic = "force-dynamic";

// Starts a checkout for the chosen plan: Paystack (naira) for Nigerian accounts,
// a Stripe subscription (USD) for everyone else. Only a superadmin of the org can
// subscribe. Returns the authorization_url for the client to redirect to.
export async function POST(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await validateSession(sessionId);
  if (!user || !hasRole(user, "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const tier = body.tier as Tier;
  if (!TIERS[tier] || !plansFor(user.selfServe).includes(tier)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, email, phone, self_serve, signup_date, last_paid_at, billing_currency, stripe_customer_id")
    .eq("id", user.organizationId)
    .single();
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  const currency = currencyFor(org);
  const usd = currency === "USD" && tier === "builder";
  if (usd ? !stripeConfigured() : !paystackConfigured()) {
    return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });
  }

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

  // Price in the account's billing currency (NGN or USD), minus any go-live offer.
  const price = tierPriceFor(tier, org);
  let amount = price;
  let reference = "";
  let authorizationUrl = "";
  try {
    const firstQuizAt = org.self_serve ? await firstBuilderQuizAt(org.id) : null;
    const offer = goLiveOffer(org as OrgBilling, firstQuizAt);
    amount = price - offer.discount;
    if (usd) {
      // Stripe fills {CHECKOUT_SESSION_ID}; ?reference= matches Paystack's return
      // so the Purchase pixel fires the same way.
      const session = await createSubscriptionCheckout({
        orgId: org.id,
        email,
        customerId: org.stripe_customer_id,
        priceUsd: price,
        discountUsd: offer.discount,
        publishQuizId,
        successUrl: `${callbackUrl}&reference={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/dashboard/${org.slug}${publishQuizId ? "?tab=builder" : ""}`,
      });
      if (!session.ok || !session.data.url) {
        console.error("[billing/checkout] stripe session failed:", session.data.error?.message);
        // Stripe's own error text (never a key) so config problems are visible in the activity log.
        await track("checkout_failed", {
          orgId: org.id,
          props: {
            provider: "stripe",
            stripe: stripeDiagnostics(),
            status: session.status,
            code: session.data.error?.code ?? null,
            message: (session.data.error?.message || "").replace(/(sk|rk|pk)_(live|test)_[A-Za-z0-9*]+/g, "$1_$2_…").slice(0, 300),
          },
          request,
        });
        return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
      }
      reference = session.data.id;
      authorizationUrl = session.data.url;
    } else {
      const init = await initTransaction({
        email,
        tier,
        priceNaira: price,
        orgId: org.id,
        callbackUrl,
        discountNaira: offer.discount,
        publishQuizId,
      });
      if (!init?.status || !init?.data?.authorization_url) {
        console.error("[billing/checkout] paystack init failed:", init?.message);
        return NextResponse.json({ error: init?.message || "Could not start checkout." }, { status: 502 });
      }
      reference = init.data.reference || "";
      authorizationUrl = init.data.authorization_url;
    }
  } catch (e) {
    console.error("[billing/checkout] payment provider unreachable:", e);
    await track("checkout_failed", {
      orgId: org.id,
      props: { provider: usd ? "stripe" : "paystack", ...(usd ? { stripe: stripeDiagnostics() } : {}), message: String(e instanceof Error ? e.message : e).slice(0, 300) },
      request,
    });
    return NextResponse.json({ error: "Payment provider unreachable — please try again." }, { status: 502 });
  }
  const { fbp, fbc } = metaCookies(request);
  await track("checkout_started", {
    orgId: org.id,
    quizId: publishQuizId,
    props: { tier, currency, amount, ...(usd ? { stripe: stripeDiagnostics() } : { amount_naira: amount }), reference, fbp, fbc },
    request,
  });

  // Heads-up for the team on every self-serve checkout, paid or not, so Stella
  // can follow up if no payment alert comes after it.
  if (org.self_serve) {
    await sendTeamAlert(`🛒 Checkout opened: ${org.name ?? email}`, [
      ["Business", org.name ?? ""],
      ["Email", email],
      ["WhatsApp", org.phone ? waLink(org.phone) : "Not given"],
      ["Amount", `${money(amount, currency)}${amount < price ? ` (${money(price - amount, currency)} go-live discount)` : ""}${usd ? " via Stripe" : ""}`],
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
      value: amount,
      currency: usd ? "USD" : "NGN",
      eventSourceUrl: sig.eventSourceUrl,
      clientIp: sig.clientIp,
      userAgent: sig.userAgent,
      fbp,
      fbc,
    });
  }
  return NextResponse.json({
    authorization_url: authorizationUrl,
    reference,
    amount,
    currency: usd ? "USD" : "NGN",
    amountNaira: usd ? undefined : amount,
    metaEventId,
  });
}
