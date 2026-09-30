// Turns a completed Stripe Checkout (subscription or top-up) into an active
// LeadScoreAI account. Used by the Stripe webhook AND by the return page
// (/api/dashboard/billing/stripe-confirm), so activation never depends on the
// webhook alone. Safe to run twice: the first caller claims the subscription
// (conditional update) and only it sends emails and alerts.
import { createServiceClient } from "./supabase";
import { STRIPE_APP, billingStatusFor, getSubscription, periodEndOf } from "./stripe";
import { PRICING, editsFor, money } from "./money";
import { lagosNow, sendOwnerEmailOnce, sendTeamAlert } from "./builder-emails";
import { track } from "./track";
import { sendMetaEvent } from "./meta-capi";

export type Obj = Record<string, unknown>;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.leadscoreai.com";
export const usd = (n: number) => money(n, "USD");
export const dateStr = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export interface OrgRow {
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

export const metaOf = (o: Obj) => (o.metadata as Record<string, string> | undefined) || {};

export async function orgById(id: string | undefined): Promise<OrgRow | null> {
  if (!id) return null;
  const { data } = await createServiceClient().from("organizations").select(ORG_COLS).eq("id", id).maybeSingle();
  return (data as OrgRow) || null;
}

export async function orgByCustomer(customer: unknown): Promise<OrgRow | null> {
  if (typeof customer !== "string" || !customer) return null;
  const { data } = await createServiceClient()
    .from("organizations")
    .select(ORG_COLS)
    .eq("stripe_customer_id", customer)
    .maybeSingle();
  return (data as OrgRow) || null;
}

export async function applyCheckoutSession(s: Obj): Promise<"activated" | "already" | "ignored" | "topup"> {
  const meta = metaOf(s);
  if (meta.app !== STRIPE_APP) return "ignored"; // a PI checkout
  const org = await orgById(meta.lsai_org_id);
  if (!org) return "ignored";
  const supabase = createServiceClient();
  const customer = typeof s.customer === "string" ? s.customer : null;
  const paidUsd = (Number(s.amount_total) || 0) / 100;
  const sessionId = String(s.id || "");

  if (meta.purpose === "leadscoreai_topup") {
    if (s.payment_status !== "paid") return "ignored";
    const credits = Math.floor(Number(meta.credits) || 0);
    if (credits <= 0 || credits > editsFor(paidUsd, "USD")) return "ignored";
    const { error } = await supabase.from("builder_credit_ledger").insert({
      organization_id: org.id,
      kind: "topup",
      credits,
      paystack_ref: sessionId, // unique: a retried webhook can't credit twice
    });
    if (error?.code === "23505") return "already";
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
    return "topup";
  }

  if (meta.purpose !== "leadscoreai_subscription") return "ignored";
  if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required") return "ignored";
  const subId = typeof s.subscription === "string" ? s.subscription : null;
  if (!subId || !customer) return "ignored";
  const sub = await getSubscription(subId);
  if (!sub.ok) throw new Error(sub.data.error?.message || "Could not load subscription");
  const end = periodEndOf(sub.data) ?? new Date(Date.now() + 30 * 24 * 3600 * 1000);
  // Claim this subscription once: only the first caller (webhook or return
  // page) gets a row back, so emails and alerts are sent exactly once.
  const { data: claimed } = await supabase
    .from("organizations")
    .update({ stripe_subscription_id: subId })
    .eq("id", org.id)
    .or(`stripe_subscription_id.is.null,stripe_subscription_id.neq.${subId}`)
    .select("id");
  const firstTime = !!claimed?.length;

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
  if (!firstTime) return "already"; // state is set; side effects already ran

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
  return "activated";
}
