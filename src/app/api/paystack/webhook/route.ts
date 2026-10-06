import { recordPartnerEarning } from "@/lib/partners";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { verifyWebhookSignature, TIERS, Tier, GO_LIVE_DISCOUNT_NAIRA, tierPriceFloor, tierPriceFor } from "@/lib/paystack";
import { editsForNaira } from "@/lib/credits";
import { lagosNow, sendOwnerEmailOnce, sendTeamAlert } from "@/lib/builder-emails";
import { track } from "@/lib/track";
import { sendMetaEvent } from "@/lib/meta-capi";

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

export const dynamic = "force-dynamic";

// Paystack webhook. On a verified successful charge for a subscription, mark the
// org active on the paid tier and extend the paid period by one month. Always
// returns 200 so Paystack doesn't retry a handled event.
export async function POST(request: Request) {
  const raw = await request.text();
  const sig = request.headers.get("x-paystack-signature");
  if (!verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (event?.event === "charge.success") {
    const d = event.data || {};
    const meta = (d.metadata || {}) as {
      orgId?: string;
      tier?: string;
      purpose?: string;
      discount_naira?: number;
      publish_quiz_id?: string | null;
      amount_naira?: number;
      credits?: number;
    };
    const orgId = meta.orgId;
    const tier = meta.tier as Tier;
    const amountNaira = (Number(d.amount) || 0) / 100;
    // Metadata is set server-side at checkout; cap the discount at the offer anyway.
    const discount = Math.min(Math.max(Number(meta.discount_naira) || 0, 0), GO_LIVE_DISCOUNT_NAIRA);

    // Builder AI-edit top-up: add the credits once per Paystack reference.
    const credits = Math.floor(Number(meta.credits) || 0);
    if (
      meta.purpose === "leadscoreai_topup" &&
      orgId &&
      d.status === "success" &&
      credits > 0 &&
      credits <= editsForNaira(amountNaira)
    ) {
      const supabase = createServiceClient();
      const { error } = await supabase.from("builder_credit_ledger").insert({
        organization_id: orgId,
        kind: "topup",
        credits,
        amount_naira: Math.round(amountNaira),
        paystack_ref: (d.reference as string) || null,
      });
      // 23505 = this reference was already credited (Paystack retried the webhook).
      if (error && error.code !== "23505") console.error("[paystack] top-up insert error:", error.message);
      else if (!error) {
        console.log(`[paystack] +${credits} AI edits for org ${orgId}`);
        await track("topup_paid", { orgId, props: { amount_naira: Math.round(amountNaira), credits } });
        const { data: o } = await supabase.from("organizations").select("name, email").eq("id", orgId).maybeSingle();
        await sendTeamAlert(`⚡ Top-up: ${o?.name ?? orgId} bought ${credits} AI edits`, [
          ["Business", o?.name ?? orgId],
          ["Email", o?.email ?? ""],
          ["Paid", naira(amountNaira)],
          ["AI edits", String(credits)],
          ["Reference", String(d.reference ?? "")],
          ["When", lagosNow()],
        ]);
      }
    }

    // Guard: only our subscription charges, and the amount must cover the tier.
    if (
      meta.purpose === "leadscoreai_subscription" &&
      orgId &&
      TIERS[tier] &&
      amountNaira >= tierPriceFloor(tier) - discount &&
      d.status === "success"
    ) {
      try {
        const supabase = createServiceClient();
        const { data: org } = await supabase
          .from("organizations")
          .select("id, name, slug, email, self_serve, signup_date, current_period_end, paystack_ref")
          .eq("id", orgId)
          .single();
        // Paystack retries webhooks: never extend the period twice for one payment.
        if (d.reference && org?.paystack_ref === d.reference) {
          return NextResponse.json({ ok: true });
        }
        // Extend from the later of now / the current period end.
        const cur = org?.current_period_end ? new Date(org.current_period_end) : null;
        const base = cur && cur > new Date() ? cur : new Date();
        const end = new Date(base.getTime() + 30 * 24 * 3600 * 1000);
        await supabase
          .from("organizations")
          .update({
            billing_tier: tier,
            billing_status: "active",
            current_period_end: end.toISOString(),
            last_paid_at: new Date().toISOString(),
            paystack_ref: (d.reference as string) || null,
          })
          .eq("id", orgId);
        console.log(`[paystack] ${tier} active for org ${orgId} until ${end.toISOString()}`);

        // Paid from the builder's "Go live" button: put that quiz live now.
        if (typeof meta.publish_quiz_id === "string" && meta.publish_quiz_id) {
          const { error: pubErr } = await supabase
            .from("quizzes")
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq("id", meta.publish_quiz_id)
            .eq("organization_id", orgId)
            .not("builder_config", "is", null);
          if (pubErr) console.error("[paystack] auto-publish error:", pubErr.message);
        }

        await track("paid", {
          orgId,
          props: { tier, amount_naira: Math.round(amountNaira), discount_naira: discount, self_serve: !!org?.self_serve },
        });
        await recordPartnerEarning({
          orgId,
          paymentRef: String(d.reference ?? ""),
          clientPaid: naira(amountNaira),
          settled: (meta as { partner_split?: boolean }).partner_split === true,
        });

        // Meta (Siteflipmarket dataset): Purchase for self-serve owners (ad conversions).
        // Browser cookies come from their sign-up / checkout events for better matching.
        if (org?.self_serve && d.reference) {
          const { data: evs } = await supabase
            .from("builder_events")
            .select("props")
            .eq("organization_id", orgId)
            .in("event", ["checkout_started", "signed_up"])
            .order("created_at", { ascending: false })
            .limit(5);
          const withCookies = (evs || []).map((e) => e.props as { fbp?: string; fbc?: string }).find((p) => p?.fbp || p?.fbc);
          await sendMetaEvent({
            eventName: "Purchase",
            eventId: `purchase_${d.reference}`,
            email: org.email,
            externalId: org.id,
            value: Math.round(amountNaira),
            currency: "NGN",
            contentName: `quiz_builder_${tier}`,
            eventSourceUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://app.leadscoreai.com"}/dashboard/${org.slug}`,
            fbp: withCookies?.fbp ?? null,
            fbc: withCookies?.fbc ?? null,
          });
        }

        // "You're in" for self-serve owners, and a purchase alert for the team.
        if (org?.self_serve) {
          await sendOwnerEmailOnce(
            "pro_welcome",
            { id: org.id, name: org.name, slug: org.slug, email: org.email },
            {
              hasQuiz: true,
              offerEndsAt: null,
              periodEnd: end.toISOString(),
              amountPaid: amountNaira,
              quizLive: typeof meta.publish_quiz_id === "string" && !!meta.publish_quiz_id,
              price: tierPriceFor(tier, org),
              plan: tier === "starter" ? "starter" : "builder",
            },
            String(d.reference ?? end.toISOString())
          );
        }
        await sendTeamAlert(`💰 New payment: ${org?.name ?? orgId} is on ${TIERS[tier].label}`, [
          ["Business", org?.name ?? orgId],
          ["Email", org?.email ?? ""],
          ["Plan", `${TIERS[tier].label}${org?.self_serve ? " (self-serve)" : ""}`],
          ["Paid", naira(amountNaira) + (discount ? ` (${naira(discount)} go-live discount)` : "")],
          ["Paid until", end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })],
          ["Reference", String(d.reference ?? "")],
          ["When", lagosNow()],
        ]);
      } catch (e) {
        console.error("[paystack] update error:", e);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
