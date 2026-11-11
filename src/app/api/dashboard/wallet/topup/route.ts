import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest, hasRole } from "@/lib/auth";
import { initWalletTopup, paystackConfigured, pickBillingEmail } from "@/lib/paystack";
import { pressPlayEnabled } from "@/lib/wallet";
import { KOBO, checkoutFor, topupAmountError } from "@/lib/wallet-math";
import { track } from "@/lib/track";

export const dynamic = "force-dynamic";

// Start a wallet top-up. The customer picks the balance they want; 7.5% VAT is
// added on top, and the server works out both so the browser can't change them.
export async function POST(request: Request) {
  if (!pressPlayEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await validateSession(sessionId);
  if (!user || !hasRole(user, "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!paystackConfigured()) {
    return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const balanceKobo = Number(body.amountNaira) * KOBO;
  const amountError = topupAmountError(balanceKobo);
  if (amountError) return NextResponse.json({ error: amountError }, { status: 400 });

  const supabase = createServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, email")
    .eq("id", user.organizationId)
    .single();
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  const email = pickBillingEmail(org.email, user.username);
  if (!email) return NextResponse.json({ error: "Add a valid billing email in Settings first." }, { status: 400 });

  const checkout = checkoutFor(balanceKobo);
  const origin = new URL(request.url).origin;
  let init;
  try {
    init = await initWalletTopup({
      email,
      orgId: org.id,
      checkout,
      callbackUrl: `${origin}/dashboard/${org.slug}?wallet=success`,
    });
  } catch (e) {
    console.error("[wallet/topup] paystack unreachable:", e);
    return NextResponse.json({ error: "Payment provider unreachable. Try again." }, { status: 502 });
  }
  if (!init?.status || !init?.data?.authorization_url) {
    console.error("[wallet/topup] paystack init failed:", init?.message);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
  }
  await track("wallet_checkout_started", {
    orgId: org.id,
    props: { balance_kobo: checkout.balanceKobo, vat_kobo: checkout.vatKobo, total_kobo: checkout.totalKobo },
    request,
  });
  return NextResponse.json({ authorization_url: init.data.authorization_url, checkout });
}
