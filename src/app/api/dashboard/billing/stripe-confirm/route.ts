import { NextResponse } from "next/server";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { applyCheckoutSession, metaOf, type Obj } from "@/lib/stripe-activation";
import { track } from "@/lib/track";

export const dynamic = "force-dynamic";

// Back from Stripe Checkout (?reference=cs_…): ask Stripe directly whether the
// session was paid and activate the account now, instead of waiting on the
// webhook. Only the signed-in org's own checkout can be confirmed.
export async function POST(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  const user = sessionId ? await validateSession(sessionId) : null;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stripeConfigured()) return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const reference = typeof body.reference === "string" ? body.reference : "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(reference)) {
    return NextResponse.json({ error: "Invalid reference" }, { status: 400 });
  }

  const res = await stripe<Obj>("GET", `checkout/sessions/${reference}`);
  if (!res.ok) {
    console.error("[stripe-confirm] lookup failed:", res.data.error?.message);
    return NextResponse.json({ error: "Could not check the payment." }, { status: 502 });
  }
  if (metaOf(res.data).lsai_org_id !== user.organizationId) {
    return NextResponse.json({ error: "Not your checkout." }, { status: 403 });
  }
  if (res.data.status !== "complete") return NextResponse.json({ result: "pending" });

  const result = await applyCheckoutSession(res.data);
  if (result === "activated" || result === "topup") {
    await track("stripe_confirmed_on_return", { orgId: user.organizationId, props: { result, reference }, request });
  }
  return NextResponse.json({ result });
}
