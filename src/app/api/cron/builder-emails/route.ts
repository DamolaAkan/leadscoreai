import { NextResponse } from "next/server";
import { cronGate, runLifecycleEmails } from "@/lib/lifecycle-emails";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily (Vercel cron, 07:00 UTC = 08:00 Lagos): lifecycle emails for NAIRA
// (Paystack) self-serve accounts. USD (Stripe) accounts run in
// /api/cron/stripe-emails. Safe to re-run: every email is logged once per org.
export async function GET(request: Request) {
  const gate = cronGate(request);
  if (gate.error) return NextResponse.json({ error: gate.error.message }, { status: gate.error.status });
  try {
    const result = await runLifecycleEmails({ currency: "NGN", dryRun: gate.dryRun });
    console.log("[cron/builder-emails]", JSON.stringify({ orgs: result.orgs, sent: result.sent }));
    return NextResponse.json({ ok: true, dryRun: gate.dryRun, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
