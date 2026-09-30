import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  STRIPE_APP,
  billingStatusFor,
  getSubscription,
  periodEndOf,
  stripeWebhookSecret,
  verifyStripeSignature,
  type StripeSubscription,
} from "@/lib/stripe";
import { PRICING, editsFor, money } from "@/lib/money";
import { lagosNow, sendOwnerEmailOnce, sendTeamAlert } from "@/lib/builder-emails";
import { track } from "@/lib/track";
import { sendMetaEvent } from "@/lib/meta-capi";

export const dynamic = "force-dynamic";

// Stripe webhook for USD (non-Nigerian) self-serve accounts. The Stripe account
// is shared with Practice Interactions, so anything without our metadata
// (app=leadscoreai) or a customer we know is ignored. Always 200 once verified,
// so Stripe doesn't retry events we chose to skip.
//
// Access model: current_period_end only moves forward on a PAID event
// (checkout completed, invoice.paid); subscription updates only change status.

type Obj = Record<string, unknown>;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.leadscoreai.com";
const usd = (n: number) => money(n, "USD");
const dateStr = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  self_serve: boolean | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}
const ORG_COLS = "id, name, slug, email, phone, self_serve, stripe_customer_id, stripe_subscription_id";

export async function POST(request: Request) {
  const secret = stripeWebhookSecret();
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const raw = await request.text();
  if (!verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let event: { id?: string; type?: string; data?: { object?: Obj; previous_attributes?: Obj } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ received: true });
  }
  const obj = event.data?.object || {};
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(obj);
        break;
      case "invoice.paid":
        await onInvoicePaid(obj);
        break;
      case "invoice.payment_failed":
        await onInvoiceFailed(obj);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await onSubscriptionChanged(obj as unknown as StripeSubscription, event.type, event.data?.previous_attributes);
        break;
    }
  } catch (e) {
    // 500 so Stripe retries: every handler is safe to run twice.
    console.error(`[stripe] ${event.type} failed:`, e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

const metaOf = (o: Obj) => (o.metadata as Record<string, string> | undefined) || {};

async function orgById(id: string | undefined): Promise<OrgRow | null> {
  if (!id) return null;
  const { data } = await createServiceClient().from("organizations").select(ORG_COLS).eq("id", id).maybeSingle();
  return (data as OrgRow) || null;
}

async function orgByCustomer(customer: unknown): Promise<OrgRow | null> {
  if (typeof customer !== "string" || !customer) return null;
  const { data } = await createServiceClient()
    .from("organizations")
    .select(ORG_COLS)
    .eq("stripe_customer_id", customer)
    .maybeSingle();
  return (data as OrgRow) || null;
}

async function onCheckoutCompleted(s: Obj) {
  const meta = metaOf(s);
  if (meta.app !== STRIPE_APP) return; // a PI checkout
  const org = await orgById(meta.lsai_org_id);
  if (!org) return;
  const supabase = createServiceClient();
  const customer = typeof s.customer === "string" ? s.customer : null;
  const paidUsd = (Number(s.amount_total) || 0) / 100;
  const sessionId = String(s.id || "");

  if (meta.purpose === "leadscoreai_topup") {
    if (s.payment_status !== "paid") return;
    const credits = Math.floor(Number(meta.credits) || 0);
    if (credits <= 0 || credits > editsFor(paidUsd, "USD")) return;
    const { error } = await supabase.from("builder_credit_ledger").insert({
      organization_id: org.id,
      kind: "topup",
      credits,
      paystack_ref: sessionId, // unique: a retried webhook can't credit twice
    });
    if (error?.code === "23505") return;
    if (error) throw new Error(error.message);
    if (customer && !org.stripe_customer_id) {
      await supabase.from("organizations").update({ stripe_customer_id: customer }).eq("id", org.id);
    }
    await track("topup_paid", { orgId: org.id, props: { amount: paidUsd, currency: "USD", credits } });
    await sendTeamAlert(`⚡ Top-up: ${org.name} bought ${credits} AI edits`, [
      ["Business", org.name],
      ["Email", org.email ?? ""],
      ["Paid", `${usd(paidUsd)} via Stripe`],
      ["AI edits", String(credits)],
      ["Reference", sessionId],
      ["When", lagosNow()],
    ]);
    return;
  }

  if (meta.purpose !== "leadscoreai_subscription") return;
  const subId = typeof s.subscription === "string" ? s.subscription : null;
  if (!subId || !customer) return;
  const sub = await getSubscription(subId);
  if (!sub.ok) throw new Error(sub.data.error?.message || "Could not load subscription");
  const end = periodEndOf(sub.data) ?? new Date(Date.now() + 30 * 24 * 3600 * 1000);
  const firstTime = org.stripe_subscription_id !== subId;

  await supabase
    .from("organizations")
    .update({
      stripe_customer_id: customer,
      stripe_subscription_id: subId,
      billing_tier: "builder",
      billing_status: billingStatusFor(sub.data.status),
      current_period_end: end.toISOString(),
      last_paid_at: new Date().toISOString(),
    })
    .eq("id", org.id);
  console.log(`[stripe] Pro active for org ${org.id} until ${end.toISOString()}`);
  if (!firstTime) return; // retried webhook: state is set, side effects already ran

  const publishQuizId = meta.publish_quiz_id || null;
  if (publishQuizId) {
    const { error: pubErr } = await supabase
      .from("quizzes")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", publishQuizId)
      .eq("organization_id", org.id)
      .not("builder_config", "is", null);
    if (pubErr) console.error("[stripe] auto-publish error:", pubErr.message);
  }

  const discount = Math.max(0, PRICING.USD.pro - paidUsd);
  await track("paid", {
    orgId: org.id,
    props: { tier: "builder", amount: paidUsd, currency: "USD", discount, self_serve: !!org.self_serve, provider: "stripe" },
  });

  // Meta Purchase, same event id as the browser pixel on the success page.
  const { data: evs } = await supabase
    .from("builder_events")
    .select("props")
    .eq("organization_id", org.id)
    .in("event", ["checkout_started", "signed_up"])
    .order("created_at", { ascending: false })
    .limit(5);
  const withCookies = (evs || []).map((e) => e.props as { fbp?: string; fbc?: string }).find((p) => p?.fbp || p?.fbc);
  await sendMetaEvent({
    eventName: "Purchase",
    eventId: `purchase_${sessionId}`,
    email: org.email,
    externalId: org.id,
    value: paidUsd,
    currency: "USD",
    contentName: "quiz_builder_builder",
    eventSourceUrl: `${APP_URL}/dashboard/${org.slug}`,
    fbp: withCookies?.fbp ?? null,
    fbc: withCookies?.fbc ?? null,
  });

  await sendOwnerEmailOnce(
    "pro_welcome",
    { id: org.id, name: org.name, slug: org.slug, email: org.email },
    {
      hasQuiz: true,
      offerEndsAt: null,
      periodEnd: end.toISOString(),
      amountPaid: paidUsd,
      quizLive: !!publishQuizId,
      price: PRICING.USD.pro,
      currency: "USD",
    },
    sessionId
  );
  await sendTeamAlert(`💰 New payment: ${org.name} is on Pro (USD)`, [
    ["Business", org.name],
    ["Email", org.email ?? ""],
    ["Paid", `${usd(paidUsd)} via Stripe${discount > 0 ? ` (${usd(discount)} go-live discount)` : ""}`],
    ["Renews", `${usd(PRICING.USD.pro)} a month on their card, automatically`],
    ["Paid until", dateStr(end)],
    ["Reference", sessionId],
    ["When", lagosNow()],
  ]);
}

// Monthly renewals. The first invoice is handled by checkout.session.completed.
async function onInvoicePaid(inv: Obj) {
  if (inv.billing_reason === "subscription_create") return;
  const org = await orgByCustomer(inv.customer);
  if (!org) return; // a PI customer
  const lines = (inv.lines as { data?: { period?: { end?: number } }[] } | undefined)?.data || [];
  const endTs = Math.max(0, ...lines.map((l) => l.period?.end || 0));
  if (!endTs) return;
  const end = new Date(endTs * 1000);
  const paidUsd = (Number(inv.amount_paid) || 0) / 100;
  await createServiceClient()
    .from("organizations")
    .update({ billing_status: "active", current_period_end: end.toISOString(), last_paid_at: new Date().toISOString() })
    .eq("id", org.id);
  await track("renewed", { orgId: org.id, props: { amount: paidUsd, currency: "USD", provider: "stripe" } });
  await sendTeamAlert(`🔁 Renewal: ${org.name} paid ${usd(paidUsd)}`, [
    ["Business", org.name],
    ["Email", org.email ?? ""],
    ["Paid", `${usd(paidUsd)} via Stripe`],
    ["Paid until", dateStr(end)],
    ["Invoice", String(inv.id ?? "")],
    ["When", lagosNow()],
  ]);
}

async function onInvoiceFailed(inv: Obj) {
  const org = await orgByCustomer(inv.customer);
  if (!org) return;
  const next = typeof inv.next_payment_attempt === "number" ? new Date(inv.next_payment_attempt * 1000) : null;
  await track("payment_failed", { orgId: org.id, props: { currency: "USD", provider: "stripe", attempt: inv.attempt_count } });
  await sendTeamAlert(`⚠️ Card payment failed: ${org.name}`, [
    ["Business", org.name],
    ["Email", org.email ?? ""],
    ["WhatsApp", org.phone ? `https://wa.me/${org.phone}` : "Not given"],
    ["Amount", usd((Number(inv.amount_due) || 0) / 100)],
    ["Attempt", String(inv.attempt_count ?? 1)],
    ["Next retry", next ? `${dateStr(next)} (Stripe retries automatically)` : "No more retries"],
    ["When", lagosNow()],
  ]);
}

async function onSubscriptionChanged(sub: StripeSubscription, type: string, prev: Obj | undefined) {
  const org = (sub.metadata?.app === STRIPE_APP ? await orgById(sub.metadata.lsai_org_id) : null) ?? (await orgByCustomer(sub.customer));
  if (!org) return;
  const deleted = type === "customer.subscription.deleted";
  const status = deleted ? "canceled" : billingStatusFor(sub.status);
  await createServiceClient()
    .from("organizations")
    .update({ billing_status: status, stripe_subscription_id: sub.id })
    .eq("id", org.id);

  const startedCancelling = !deleted && sub.cancel_at_period_end === true && prev?.cancel_at_period_end === false;
  if (deleted || startedCancelling) {
    const end = periodEndOf(sub);
    await track(deleted ? "subscription_ended" : "subscription_cancelling", { orgId: org.id, props: { provider: "stripe" } });
    await sendTeamAlert(
      deleted ? `🛑 Subscription ended: ${org.name}` : `👋 ${org.name} cancelled (active until period end)`,
      [
        ["Business", org.name],
        ["Email", org.email ?? ""],
        ["WhatsApp", org.phone ? `https://wa.me/${org.phone}` : "Not given"],
        ["Access until", end ? dateStr(end) : "Now"],
        ["When", lagosNow()],
      ]
    );
  }
}
