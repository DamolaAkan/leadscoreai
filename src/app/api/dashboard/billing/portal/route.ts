import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest, hasRole } from "@/lib/auth";
import { createPortalSession, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// USD (Stripe) accounts: open Stripe's billing portal to update the card,
// see invoices or cancel. Paystack accounts renew by paying again instead.
export async function POST(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await validateSession(sessionId);
  if (!user || !hasRole(user, "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!stripeConfigured()) return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });

  const supabase = createServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("slug, stripe_customer_id")
    .eq("id", user.organizationId)
    .single();
  if (!org?.stripe_customer_id) {
    return NextResponse.json({ error: "No card subscription on this account yet." }, { status: 400 });
  }
  const origin = new URL(request.url).origin;
  const portal = await createPortalSession(org.stripe_customer_id, `${origin}/dashboard/${org.slug}?tab=settings`);
  if (!portal.ok || !portal.data.url) {
    console.error("[billing/portal] stripe portal failed:", portal.data.error?.message);
    return NextResponse.json({ error: "Could not open billing. Try again or contact support." }, { status: 502 });
  }
  return NextResponse.json({ url: portal.data.url });
}
