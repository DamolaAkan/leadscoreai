import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest, hasRole } from "@/lib/auth";
import { initTopupTransaction, paystackConfigured, pickBillingEmail } from "@/lib/paystack";
import {
  TOPUP_MAX_NAIRA,
  TOPUP_MIN_NAIRA,
  TOPUP_STEP_NAIRA,
  editsForNaira,
  getCreditStatus,
  loadOrgForCredits,
} from "@/lib/credits";
import { track } from "@/lib/track";

export const dynamic = "force-dynamic";

// Buy extra builder AI edits. Only Pro accounts that have used this month's
// allowance can top up, in ₦10,000 steps (₦10,000 = 45 edits).
export async function POST(request: Request) {
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
  const amountNaira = Math.floor(Number(body.amountNaira));
  if (
    !Number.isFinite(amountNaira) ||
    amountNaira < TOPUP_MIN_NAIRA ||
    amountNaira > TOPUP_MAX_NAIRA ||
    amountNaira % TOPUP_STEP_NAIRA !== 0
  ) {
    return NextResponse.json(
      { error: `Top up in steps of ₦${TOPUP_STEP_NAIRA.toLocaleString()} (up to ₦${TOPUP_MAX_NAIRA.toLocaleString()}).` },
      { status: 400 }
    );
  }

  const creditOrg = await loadOrgForCredits(user.organizationId);
  if (!creditOrg) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  const credits = await getCreditStatus(creditOrg);
  if (!credits.canTopUp) {
    return NextResponse.json(
      {
        error: credits.paid
          ? "Top-ups open once you've used this month's AI edits."
          : "Top-ups are for Pro accounts. Go Pro to get 150 AI edits a month.",
      },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, email")
    .eq("id", user.organizationId)
    .single();
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  const email = pickBillingEmail(org.email, user.username);
  if (!email) return NextResponse.json({ error: "Add a valid billing email in Settings first." }, { status: 400 });

  const origin = new URL(request.url).origin;
  let init;
  try {
    init = await initTopupTransaction({
      email,
      orgId: org.id,
      amountNaira,
      credits: editsForNaira(amountNaira),
      callbackUrl: `${origin}/dashboard/${org.slug}?tab=builder&topup=success`,
    });
  } catch (e) {
    console.error("[billing/topup] paystack unreachable:", e);
    return NextResponse.json({ error: "Payment provider unreachable. Try again." }, { status: 502 });
  }
  if (!init?.status || !init?.data?.authorization_url) {
    console.error("[billing/topup] paystack init failed:", init?.message);
    return NextResponse.json({ error: init?.message || "Could not start checkout." }, { status: 502 });
  }
  await track("topup_checkout_started", { orgId: org.id, props: { amount_naira: amountNaira }, request });
  return NextResponse.json({ authorization_url: init.data.authorization_url });
}
