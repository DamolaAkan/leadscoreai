import { NextResponse } from "next/server";
import { createServiceClient } from "./supabase";
import { billingPeriodStart, computeAccess, isPaid, type AccessState, type OrgBilling } from "./paystack";

// Server-side dashboard lock: the same rule the dashboard shows (computeAccess),
// enforced on every route that reads or changes lead data. Locked = trial over,
// free leads used, or a Starter past its monthly lead allowance.

// Real leads = responses except test leads (the org testing with its own email).
async function realLeads(orgId: string, orgEmail: string | null, since?: string): Promise<number> {
  const supabase = createServiceClient();
  let all = supabase.from("quiz_responses").select("id", { count: "exact", head: true }).eq("organization_id", orgId);
  if (since) all = all.gte("created_at", since);
  const { count: total } = await all;
  let test = 0;
  if (orgEmail) {
    let t = supabase
      .from("quiz_responses")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .ilike("contact_email", orgEmail); // no wildcards = case-insensitive exact
    if (since) t = t.gte("created_at", since);
    const { count } = await t;
    test = count ?? 0;
  }
  return Math.max(0, (total ?? 0) - test);
}

export interface OrgAccess {
  org: (OrgBilling & { email?: string | null }) | null;
  access: AccessState;
  periodLeads: number | null; // Starter only: real leads this billing month
}

export async function getOrgAccess(orgId: string): Promise<OrgAccess> {
  const { data } = await createServiceClient().from("organizations").select("*").eq("id", orgId).single();
  const org = (data || null) as (OrgBilling & { email?: string | null }) | null;
  const email = org?.email ?? null;
  const periodStart = org?.billing_tier === "starter" && isPaid(org) ? billingPeriodStart(org) : null;
  const [total, inPeriod] = await Promise.all([
    realLeads(orgId, email),
    periodStart ? realLeads(orgId, email, periodStart.toISOString()) : Promise.resolve(0),
  ]);
  return { org, access: computeAccess(org ?? {}, total, inPeriod), periodLeads: periodStart ? inPeriod : null };
}

// For lead-data routes: a 402 when the dashboard is locked, else null.
export async function lockedResponse(orgId: string): Promise<NextResponse | null> {
  const { access } = await getOrgAccess(orgId);
  if (!access.locked) return null;
  return NextResponse.json(
    {
      error:
        access.reason === "plan_leads_exhausted"
          ? "You've reached your Starter limit of leads this month. Upgrade to Pro to see them."
          : "Your dashboard is locked. Subscribe to see your leads.",
      locked: true,
      reason: access.reason,
    },
    { status: 402 }
  );
}
