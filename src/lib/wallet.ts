// Press-play wallet, server side. The balance is the sum of ad_wallet_ledger lines
// (see supabase/migrations/20261105120000_press_play_wallet.sql).
import { createServiceClient } from "./supabase";
import { checkoutFor, topupAmountError } from "./wallet-math";

// Off unless this environment turns it on, so merging changes nothing for anyone.
export function pressPlayEnabled(): boolean {
  return process.env.PRESS_PLAY_ENABLED === "1";
}

export async function getWalletBalanceKobo(orgId: string): Promise<number> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ad_wallet_balances")
    .select("balance_kobo")
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw new Error(`[wallet] balance read failed: ${error.message}`);
  return Number(data?.balance_kobo ?? 0);
}

export type CreditResult = "credited" | "duplicate" | "rejected";

// Credit a verified Paystack payment. The VAT and the total are recalculated here,
// so the balance can only ever be what was actually paid for. Paystack retries
// webhooks, and the unique reference means a retry cannot credit twice.
export async function creditWalletFromPaystack(opts: {
  orgId: string;
  balanceKobo: number;
  paidKobo: number;
  reference: string;
}): Promise<CreditResult> {
  const { orgId, balanceKobo, paidKobo, reference } = opts;
  if (!reference || topupAmountError(balanceKobo)) return "rejected";
  const { vatKobo, totalKobo } = checkoutFor(balanceKobo);
  if (paidKobo < totalKobo) return "rejected";

  const supabase = createServiceClient();
  const { error } = await supabase.from("ad_wallet_ledger").insert({
    organization_id: orgId,
    kind: "topup",
    amount_kobo: balanceKobo,
    vat_kobo: vatKobo,
    paid_kobo: paidKobo,
    paystack_ref: reference,
  });
  if (!error) return "credited";
  if (error.code === "23505") return "duplicate";
  throw new Error(`[wallet] credit failed: ${error.message}`);
}
