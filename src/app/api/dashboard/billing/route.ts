import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";
import { isPaid, TIERS, paystackConfigured, OrgBilling } from "@/lib/paystack";

export const dynamic = "force-dynamic";

// Current billing state for the org, for the Settings > Billing UI and the
// paid-feature gate. Resilient to the billing columns not existing yet.
export async function GET(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await validateSession(sessionId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", user.organizationId)
    .single();

  const b = (org || {}) as OrgBilling;
  return NextResponse.json({
    tier: b.billing_tier ?? null,
    status: b.billing_status ?? null,
    currentPeriodEnd: b.current_period_end ?? null,
    paid: isPaid(b),
    prices: { core: TIERS.core.naira, pro: TIERS.pro.naira },
    configured: paystackConfigured(),
  });
}
