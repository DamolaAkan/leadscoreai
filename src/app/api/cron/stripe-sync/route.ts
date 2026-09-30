import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { cronGate } from "@/lib/lifecycle-emails";
import { billingStatusFor, getSubscription, periodEndOf, stripeConfigured } from "@/lib/stripe";
import { lagosNow, sendTeamAlert } from "@/lib/builder-emails";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily safety net for USD (Stripe) accounts: re-read every subscription from
// Stripe and correct our copy if a webhook was missed. Status always follows
// Stripe; the paid-until date only moves FORWARD, and only when Stripe says the
// subscription is "active" (latest invoice paid), so nobody gets free time.
export async function GET(request: Request) {
  const gate = cronGate(request);
  if (gate.error) return NextResponse.json({ error: gate.error.message }, { status: gate.error.status });
  if (!stripeConfigured()) return NextResponse.json({ ok: true, skipped: "Stripe not configured" });

  const supabase = createServiceClient();
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, name, billing_status, current_period_end, stripe_subscription_id")
    .eq("billing_currency", "USD")
    .not("stripe_subscription_id", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const fixes: { org: string; field: string; from: string | null; to: string }[] = [];
  const failures: { org: string; error: string }[] = [];
  for (const org of orgs || []) {
    const sub = await getSubscription(org.stripe_subscription_id as string);
    let status: string;
    let end: Date | null = null;
    if (sub.ok) {
      status = billingStatusFor(sub.data.status);
      if (sub.data.status === "active") end = periodEndOf(sub.data);
    } else if (sub.status === 404) {
      status = "canceled"; // subscription deleted in Stripe
    } else {
      failures.push({ org: org.name, error: sub.data.error?.message || `HTTP ${sub.status}` });
      continue;
    }

    const update: Record<string, string> = {};
    if (org.billing_status !== status) {
      update.billing_status = status;
      fixes.push({ org: org.name, field: "status", from: org.billing_status, to: status });
    }
    const ours = org.current_period_end ? new Date(org.current_period_end).getTime() : 0;
    if (end && end.getTime() > ours + 60_000) {
      update.current_period_end = end.toISOString();
      fixes.push({ org: org.name, field: "paid until", from: org.current_period_end, to: end.toISOString() });
    }
    if (Object.keys(update).length && !gate.dryRun) {
      await supabase.from("organizations").update(update).eq("id", org.id);
    }
  }

  // Webhooks normally keep us in sync, so any fix here is worth a look.
  if (fixes.length && !gate.dryRun) {
    await sendTeamAlert(`🔄 Stripe sync corrected ${fixes.length} record${fixes.length > 1 ? "s" : ""}`, [
      ...fixes.map((f): [string, string] => [f.org, `${f.field}: ${f.from ?? "none"} → ${f.to}`]),
      ["When", lagosNow()],
    ]);
  }
  console.log("[cron/stripe-sync]", JSON.stringify({ checked: orgs?.length ?? 0, fixes: fixes.length, failures }));
  return NextResponse.json({ ok: true, dryRun: gate.dryRun, checked: orgs?.length ?? 0, fixes, failures });
}
