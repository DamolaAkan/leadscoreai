// Quiz builder AI edits ("credits"). Every builder reply that builds or changes
// a quiz costs 1 edit; tap-question turns are free. Free accounts get a one-time
// allowance, Pro gets a monthly allowance that resets each paid period, and Pro
// accounts that run out can buy top-ups (never expire, used after the monthly
// allowance). Every AI call is logged with its real token cost so we can watch
// margins. Ledger: builder_credit_ledger.
import { createServiceClient } from "./supabase";
import { isPaid, type OrgBilling, billingPeriodStart } from "./paystack";

export const FREE_EDITS = 30;
export const PRO_MONTHLY_EDITS = 150;
export const STARTER_MONTHLY_EDITS = 30;
// Top-ups come in ₦10,000 steps of 45 edits (≈₦222/edit): >50% margin on real
// costs (~₦91/edit incl. free turns) even at ₦1,600/$.
export const TOPUP_STEP_NAIRA = 10000;
export const EDITS_PER_STEP = 45;
export const TOPUP_MIN_NAIRA = TOPUP_STEP_NAIRA;
export const TOPUP_MAX_NAIRA = 500000;

export function editsForNaira(naira: number): number {
  return Math.floor(naira / TOPUP_STEP_NAIRA) * EDITS_PER_STEP;
}

// Claude Sonnet 5 list prices, USD per million tokens (5-minute cache writes).
const PRICE = { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 };

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
}

export const emptyUsage = (): Usage => ({
  input_tokens: 0,
  output_tokens: 0,
  cache_read_tokens: 0,
  cache_write_tokens: 0,
});

export function addUsage(total: Usage, u: {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}): void {
  total.input_tokens += u.input_tokens || 0;
  total.output_tokens += u.output_tokens || 0;
  total.cache_read_tokens += u.cache_read_input_tokens || 0;
  total.cache_write_tokens += u.cache_creation_input_tokens || 0;
}

export function costUsd(u: Usage): number {
  return (
    (u.input_tokens * PRICE.input +
      u.output_tokens * PRICE.output +
      u.cache_write_tokens * PRICE.cacheWrite +
      u.cache_read_tokens * PRICE.cacheRead) /
    1_000_000
  );
}

export interface CreditStatus {
  paid: boolean;
  allowance: number; // 30 free (one-time) or 150 a month on Pro
  allowanceUsed: number;
  allowanceRemaining: number;
  topupRemaining: number;
  remaining: number;
  resetsAt: string | null; // Pro: when the monthly allowance renews
  canTopUp: boolean; // Pro accounts that have used their monthly allowance
}

type OrgForCredits = OrgBilling & { id: string };

export async function getCreditStatus(org: OrgForCredits): Promise<CreditStatus> {
  const supabase = createServiceClient();
  const paid = isPaid(org);
  // Paid: only edits since this month's payment count, so free edits used before
  // subscribing never carry over (a new subscriber always starts on the full allowance).
  const periodStart = paid ? billingPeriodStart(org)?.toISOString() ?? null : null;

  let allowanceQ = supabase
    .from("builder_credit_ledger")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("kind", "use")
    .eq("bucket", "allowance")
    .lt("credits", 0);
  if (periodStart) allowanceQ = allowanceQ.gte("created_at", periodStart);

  const [{ count: allowanceUsed }, { data: topups }, { count: topupUsed }] = await Promise.all([
    allowanceQ,
    supabase.from("builder_credit_ledger").select("credits").eq("organization_id", org.id).eq("kind", "topup"),
    supabase
      .from("builder_credit_ledger")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("kind", "use")
      .eq("bucket", "topup")
      .lt("credits", 0),
  ]);

  const allowance = paid ? (org.billing_tier === "starter" ? STARTER_MONTHLY_EDITS : PRO_MONTHLY_EDITS) : FREE_EDITS;
  const used = allowanceUsed || 0;
  const allowanceRemaining = Math.max(0, allowance - used);
  const bought = (topups || []).reduce((s, r) => s + (r.credits || 0), 0);
  const topupRemaining = Math.max(0, bought - (topupUsed || 0));
  return {
    paid,
    allowance,
    allowanceUsed: Math.min(used, allowance),
    allowanceRemaining,
    topupRemaining,
    remaining: allowanceRemaining + topupRemaining,
    resetsAt: paid ? org.current_period_end ?? null : null,
    canTopUp: paid && allowanceRemaining === 0,
  };
}

export async function loadOrgForCredits(orgId: string): Promise<OrgForCredits | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("organizations")
    .select("id, billing_tier, billing_status, current_period_end, signup_date, self_serve, last_paid_at, billing_currency")
    .eq("id", orgId)
    .maybeSingle();
  return (data as OrgForCredits) || null;
}

// Log one builder AI call. `charged` = it cost the owner an edit.
export async function recordEdit(opts: {
  organizationId: string;
  quizId: string | null;
  usage: Usage;
  charged: boolean;
  status: CreditStatus;
}): Promise<CreditStatus> {
  const { status } = opts;
  const bucket = status.allowanceRemaining > 0 ? "allowance" : "topup";
  const supabase = createServiceClient();
  const { error } = await supabase.from("builder_credit_ledger").insert({
    organization_id: opts.organizationId,
    kind: "use",
    bucket,
    credits: opts.charged ? -1 : 0,
    quiz_id: opts.quizId,
    ...opts.usage,
    cost_usd: Number(costUsd(opts.usage).toFixed(6)),
  });
  if (error) console.error("[credits] ledger insert error:", error.message);
  if (!opts.charged) return status;
  const next = { ...status };
  if (bucket === "allowance") {
    next.allowanceRemaining -= 1;
    next.allowanceUsed += 1;
  } else {
    next.topupRemaining = Math.max(0, next.topupRemaining - 1);
  }
  next.remaining = next.allowanceRemaining + next.topupRemaining;
  next.canTopUp = next.paid && next.allowanceRemaining === 0;
  return next;
}
