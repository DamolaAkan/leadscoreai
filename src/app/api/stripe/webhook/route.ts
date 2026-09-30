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
import { lagosNow, sendTeamAlert } from "@/lib/builder-emails";
import { track } from "@/lib/track";
import { applyCheckoutSession, dateStr, metaOf, orgByCustomer, orgById, usd, type Obj } from "@/lib/stripe-activation";

export const dynamic = "force-dynamic";

// Stripe webhook for USD (non-Nigerian) self-serve accounts. The Stripe account
// is shared with Practice Interactions, so anything without our metadata
// (app=leadscoreai) or a customer we know is ignored. Always 200 once verified,
// so Stripe doesn't retry events we chose to skip.
//
// Access model: current_period_end only moves forward on a PAID event
// (checkout completed, invoice.paid); subscription updates only change status.


export async function POST(request: Request) {
  const secret = stripeWebhookSecret();
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const raw = await request.text();
  if (!verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret)) {
    // Logged so a wrong signing secret shows up in the activity log.
    if (request.headers.get("stripe-signature")) {
      await track("stripe_webhook_rejected", { props: { reason: "signature" } });
    }
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let event: { id?: string; type?: string; data?: { object?: Obj; previous_attributes?: Obj } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ received: true });
  }
  const obj = event.data?.object || {};
  if (metaOf(obj).app === "leadscoreai" || String(event.type).startsWith("invoice.") || String(event.type).startsWith("customer.subscription")) {
    await track("stripe_webhook", { props: { type: event.type, id: event.id } });
  }
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await applyCheckoutSession(obj);
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
    // Status only: the subscription id is claimed by applyCheckoutSession, which
    // must still see it unset to send the welcome email and publish the quiz.
    .update({ billing_status: status })
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
