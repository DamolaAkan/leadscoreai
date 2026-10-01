import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { paystackApi, partnerFromRequest } from "@/lib/partners";

export const dynamic = "force-dynamic";

// Nigerian banks for the payout form.
export async function GET(request: Request) {
  if (!(await partnerFromRequest(request))) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const r = await paystackApi<{ name: string; code: string }[]>("/bank?country=nigeria&perPage=100");
  if (!r.ok) return NextResponse.json({ error: "Couldn't load banks. Try again." }, { status: 502 });
  return NextResponse.json({ banks: (r.data ?? []).map((b) => ({ name: b.name, code: b.code })) });
}

// Connect (or change) the partner's payout account: Paystack confirms the
// account name, then we create or update their sub-account, the same way
// Padaflow connects operators. Their commission then settles there directly.
export async function POST(request: Request) {
  const partner = await partnerFromRequest(request);
  if (!partner) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const bankCode = String(body.bank_code || "");
  const acct = String(body.account_number || "").replace(/\D/g, "");
  if (!bankCode || !/^\d{10}$/.test(acct)) {
    return NextResponse.json({ error: "Choose your bank and enter your 10-digit account number." }, { status: 400 });
  }

  const resolved = await paystackApi<{ account_name: string }>(`/bank/resolve?account_number=${acct}&bank_code=${encodeURIComponent(bankCode)}`);
  if (!resolved.ok || !resolved.data?.account_name) {
    return NextResponse.json({ error: "We couldn't find that account. Check the bank and number." }, { status: 400 });
  }
  const banks = await paystackApi<{ name: string; code: string }[]>("/bank?country=nigeria&perPage=100");
  const bankName = (banks.data ?? []).find((b) => b.code === bankCode)?.name ?? null;

  const details = {
    business_name: `${partner.full_name} (LeadScoreAI partner)`.slice(0, 100),
    settlement_bank: bankCode,
    account_number: acct,
  };
  const sub = partner.paystack_subaccount_code
    ? await paystackApi<{ subaccount_code: string }>(`/subaccount/${partner.paystack_subaccount_code}`, {
        method: "PUT",
        body: JSON.stringify(details),
      })
    : await paystackApi<{ subaccount_code: string }>("/subaccount", {
        method: "POST",
        body: JSON.stringify({
          ...details,
          percentage_charge: 80, // default only: every payment sets the exact split itself
          description: `LeadScoreAI partner ${partner.ref_code}`,
          primary_contact_email: partner.email,
        }),
      });
  const code = sub.data?.subaccount_code || partner.paystack_subaccount_code;
  if (!sub.ok || !code) {
    console.error("[partners/bank] subaccount error:", sub.message);
    return NextResponse.json({ error: "Paystack couldn't connect that account. Try again." }, { status: 502 });
  }

  await createServiceClient()
    .from("partners")
    .update({
      bank_code: bankCode,
      bank_name: bankName,
      account_number: acct,
      account_name: resolved.data.account_name,
      paystack_subaccount_code: code,
    })
    .eq("id", partner.id);
  return NextResponse.json({ ok: true, account_name: resolved.data.account_name, bank_name: bankName });
}
