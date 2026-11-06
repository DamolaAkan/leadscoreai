import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { cronGate } from "@/lib/lifecycle-emails";
import { getCampaignSpend, metaAdsConfigured } from "@/lib/meta-ads";
import { pressPlayEnabled } from "@/lib/wallet";
import { chargeDueKobo, shouldPause } from "@/lib/wallet-math";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// SHADOW MODE. Reads each campaign's spend and records what it WOULD charge and
// whether it WOULD pause, in ad_spend_snapshots with applied = false. It does not
// touch a wallet or a campaign. Those numbers get compared with Ads Manager first,
// and the charging and pausing step is only added after Damola approves them.
export async function GET(request: Request) {
  const gate = cronGate(request);
  if (gate.error) return NextResponse.json({ error: gate.error.message }, { status: gate.error.status });
  if (!pressPlayEnabled() || !metaAdsConfigured()) return NextResponse.json({ ok: true, skipped: "not enabled" });

  const supabase = createServiceClient();
  const { data: campaigns, error } = await supabase
    .from("ad_campaigns")
    .select("id, organization_id, meta_campaign_id, status, charged_total_kobo, price_multiplier")
    .in("status", ["active", "paused", "out_of_balance"])
    .not("meta_campaign_id", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { campaign: string; proposedChargeKobo: number; proposedAction: string }[] = [];
  const failures: { campaign: string; error: string }[] = [];
  for (const c of campaigns || []) {
    try {
      const spend = await getCampaignSpend(c.meta_campaign_id as string);
      const { data: wallet, error: walletError } = await supabase
        .from("ad_wallet_balances")
        .select("balance_kobo")
        .eq("organization_id", c.organization_id)
        .maybeSingle();
      if (walletError) throw new Error(walletError.message);

      const balanceKobo = Number(wallet?.balance_kobo ?? 0);
      const proposedChargeKobo = chargeDueKobo({
        metaSpendTotalKobo: spend.spendKobo,
        chargedTotalKobo: Number(c.charged_total_kobo),
        balanceKobo,
        multiplier: Number(c.price_multiplier),
      });
      const proposedAction = c.status === "active" && shouldPause(balanceKobo - proposedChargeKobo) ? "pause" : "none";

      const { error: insertError } = await supabase.from("ad_spend_snapshots").insert({
        campaign_id: c.id,
        meta_spend_total_kobo: spend.spendKobo,
        impressions: spend.impressions,
        clicks: spend.clicks,
        proposed_charge_kobo: proposedChargeKobo,
        proposed_action: proposedAction,
        applied: false,
      });
      if (insertError) throw new Error(insertError.message);
      results.push({ campaign: c.id, proposedChargeKobo, proposedAction });
    } catch (e) {
      failures.push({ campaign: c.id, error: e instanceof Error ? e.message : "Unknown error" });
    }
  }
  return NextResponse.json({ ok: failures.length === 0, shadow: true, results, failures });
}
