import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { verifyWebhookSignature, TIERS, Tier, GO_LIVE_DISCOUNT_NAIRA } from "@/lib/paystack";
import { NAIRA_PER_EDIT } from "@/lib/credits";

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
      amountNaira >= credits * NAIRA_PER_EDIT
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
      else if (!error) console.log(`[paystack] +${credits} AI edits for org ${orgId}`);
    }

    // Guard: only our subscription charges, and the amount must cover the tier.
    if (
      meta.purpose === "leadscoreai_subscription" &&
      orgId &&
      TIERS[tier] &&
      amountNaira >= TIERS[tier].naira - discount &&
      d.status === "success"
    ) {
      try {
        const supabase = createServiceClient();
        const { data: org } = await supabase
          .from("organizations")
          .select("current_period_end, paystack_ref")
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
      } catch (e) {
        console.error("[paystack] update error:", e);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
