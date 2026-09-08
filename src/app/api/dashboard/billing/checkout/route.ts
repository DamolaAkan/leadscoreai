import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest, hasRole } from "@/lib/auth";
import { initTransaction, paystackConfigured, TIERS, Tier } from "@/lib/paystack";

export const dynamic = "force-dynamic";

// Starts a Paystack checkout for the chosen plan. Only a superadmin of the org
// can subscribe. Returns the authorization_url for the client to redirect to.
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
  const tier = body.tier as Tier;
  if (!TIERS[tier]) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, email")
    .eq("id", user.organizationId)
    .single();
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  // Paystack rejects placeholder/demo domains, so pick the first genuinely valid
  // email: the org's billing email, else the logged-in user's.
  const realEmail = (e?: string | null): e is string => {
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
    const domain = e.split("@")[1].toLowerCase();
    if (/\.(example|test|invalid|localhost)$/.test(domain)) return false;
    if (["example.com", "example.org", "example.net"].includes(domain)) return false;
    return true;
  };
  const email = realEmail(org.email) ? org.email : realEmail(user.username) ? user.username : null;
  if (!email) {
    return NextResponse.json(
      { error: "Add a valid billing email in Settings first." },
      { status: 400 }
    );
  }

  const origin = new URL(request.url).origin;
  const callbackUrl = `${origin}/dashboard/${org.slug}?billing=success`;

  let init;
  try {
    init = await initTransaction({ email, tier, orgId: org.id, callbackUrl });
  } catch (e) {
    console.error("[billing/checkout] paystack unreachable:", e);
    return NextResponse.json({ error: "Payment provider unreachable — please try again." }, { status: 502 });
  }
  if (!init?.status || !init?.data?.authorization_url) {
    console.error("[billing/checkout] paystack init failed:", init?.message);
    return NextResponse.json({ error: init?.message || "Could not start checkout." }, { status: 502 });
  }
  return NextResponse.json({ authorization_url: init.data.authorization_url });
}
