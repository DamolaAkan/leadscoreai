import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest, hasRole } from "@/lib/auth";
import { currencyFor, initTopupTransaction, paystackConfigured, pickBillingEmail } from "@/lib/paystack";
import { TOPUP_MAX_NAIRA, getCreditStatus, loadOrgForCredits } from "@/lib/credits";
import { PRICING, editsFor, money } from "@/lib/money";
import { createTopupCheckout, stripeConfigured } from "@/lib/stripe";
import { track } from "@/lib/track";

const TOPUP_MAX_USD = 500;

export const dynamic = "force-dynamic";

// Buy extra builder AI edits. Only Pro accounts that have used this month's
// allowance can top up: ₦10,000 = 45 edits via Paystack, or $10 = 70 edits via
// Stripe for USD accounts, in whole steps.
export async function POST(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await validateSession(sessionId);
  if (!user || !hasRole(user, "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const creditOrg = await loadOrgForCredits(user.organizationId);
  if (!creditOrg) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  const currency = currencyFor(creditOrg);
  const usd = currency === "USD";
  if (usd ? !stripeConfigured() : !paystackConfigured()) {
    return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const amount = Math.floor(Number(body.amount ?? body.amountNaira));
  const step = PRICING[currency].topupStep;
  const max = usd ? TOPUP_MAX_USD : TOPUP_MAX_NAIRA;
  if (!Number.isFinite(amount) || amount < step || amount > max || amount % step !== 0) {
    return NextResponse.json(
      { error: `Top up in steps of ${money(step, currency)} (up to ${money(max, currency)}).` },
      { status: 400 }
    );
  }
  const credits = await getCreditStatus(creditOrg);
  if (!credits.canTopUp) {
    return NextResponse.json(
      {
        error: credits.paid
          ? "Top-ups open once you've used this month's AI edits."
          : "Top-ups are for Pro accounts. Go Pro to get 150 AI edits a month.",
      },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, email, stripe_customer_id")
    .eq("id", user.organizationId)
    .single();
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  const email = pickBillingEmail(org.email, user.username);
  if (!email) return NextResponse.json({ error: "Add a valid billing email in Settings first." }, { status: 400 });

  const origin = new URL(request.url).origin;
  const successUrl = `${origin}/dashboard/${org.slug}?tab=builder&topup=success`;
  const edits = editsFor(amount, currency);

  if (usd) {
    let session;
    try {
      session = await createTopupCheckout({
        orgId: org.id,
        email,
        customerId: org.stripe_customer_id,
        amountUsd: amount,
        credits: edits,
        successUrl,
        cancelUrl: `${origin}/dashboard/${org.slug}?tab=builder`,
      });
    } catch (e) {
      console.error("[billing/topup] stripe unreachable:", e);
      return NextResponse.json({ error: "Payment provider unreachable. Try again." }, { status: 502 });
    }
    if (!session.ok || !session.data.url) {
      console.error("[billing/topup] stripe session failed:", session.data.error?.message);
      return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
    }
    await track("topup_checkout_started", { orgId: org.id, props: { amount, currency, credits: edits }, request });
    return NextResponse.json({ authorization_url: session.data.url });
  }

  const amountNaira = amount;
  let init;
  try {
    init = await initTopupTransaction({
      email,
      orgId: org.id,
      amountNaira,
      credits: edits,
      callbackUrl: successUrl,
    });
  } catch (e) {
    console.error("[billing/topup] paystack unreachable:", e);
    return NextResponse.json({ error: "Payment provider unreachable. Try again." }, { status: 502 });
  }
  if (!init?.status || !init?.data?.authorization_url) {
    console.error("[billing/topup] paystack init failed:", init?.message);
    return NextResponse.json({ error: init?.message || "Could not start checkout." }, { status: 502 });
  }
  await track("topup_checkout_started", { orgId: org.id, props: { amount_naira: amountNaira, currency, credits: edits }, request });
  return NextResponse.json({ authorization_url: init.data.authorization_url });
}
