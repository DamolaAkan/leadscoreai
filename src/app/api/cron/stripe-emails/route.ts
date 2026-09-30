import { NextResponse } from "next/server";
import { cronGate, runLifecycleEmails } from "@/lib/lifecycle-emails";
import { getSubscription, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily (Vercel cron): lifecycle emails for USD (Stripe) self-serve accounts:
// the 7-day nudge series, "who it's for", the renewal notice and lapsed-plan
// emails, all priced in dollars. Naira accounts run in /api/cron/builder-emails.
export async function GET(request: Request) {
  const gate = cronGate(request);
  if (gate.error) return NextResponse.json({ error: gate.error.message }, { status: gate.error.status });
  try {
    const result = await runLifecycleEmails({
      currency: "USD",
      dryRun: gate.dryRun,
      // No "renews automatically" notice for a plan the owner has set to cancel.
      renewalApplies: async (org) => {
        if (!org.stripe_subscription_id || !stripeConfigured()) return true;
        const sub = await getSubscription(org.stripe_subscription_id);
        return !(sub.ok && sub.data.cancel_at_period_end);
      },
    });
    console.log("[cron/stripe-emails]", JSON.stringify({ orgs: result.orgs, sent: result.sent }));
    return NextResponse.json({ ok: true, dryRun: gate.dryRun, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
