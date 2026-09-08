import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { verifyWebhookSignature, TIERS, Tier } from "@/lib/paystack";

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
    const meta = (d.metadata || {}) as { orgId?: string; tier?: string; purpose?: string };
    const orgId = meta.orgId;
    const tier = meta.tier as Tier;
    const amountNaira = (Number(d.amount) || 0) / 100;

    // Guard: only our subscription charges, and the amount must cover the tier.
    if (
      meta.purpose === "leadscoreai_subscription" &&
      orgId &&
      TIERS[tier] &&
      amountNaira >= TIERS[tier].naira &&
      d.status === "success"
    ) {
      try {
        const supabase = createServiceClient();
        const { data: org } = await supabase
          .from("organizations")
          .select("current_period_end")
          .eq("id", orgId)
          .single();
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
      } catch (e) {
        console.error("[paystack] update error:", e);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
