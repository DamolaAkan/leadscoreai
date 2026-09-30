// Daily self-serve lifecycle emails, run separately per billing currency:
// /api/cron/builder-emails for naira (Paystack) accounts, /api/cron/stripe-emails
// for USD (Stripe) accounts. Every email is claimed once per org in
// builder_email_log, so re-runs and overlapping runs never send duplicates.
import { createServiceClient } from "./supabase";
import { PAY_TO_PUBLISH_FROM, goLiveOffer, isPaid, tierPriceFor, type OrgBilling } from "./paystack";
import { firstBuilderQuizAt } from "./go-live";
import { sendOwnerEmailOnce, type OwnerEmailKind } from "./builder-emails";
import type { Currency } from "./money";

const DAY = 24 * 3600 * 1000;
// 7-day series for self-serve owners who haven't paid (welcome is sent at sign-up).
const NUDGE_DAYS = [1, 3, 5, 7] as const;
// "Who it's for" goes out on day 2 to owners who signed up after it launched.
const WHO_ITS_FOR_DAY = 2;
const WHO_ITS_FOR_FROM = "2026-09-28T11:30:00Z";
const RENEWAL_NOTICE_DAYS = 3;
const LAPSED_WINDOW_DAYS = 7;

export type LifecycleOrg = OrgBilling & {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  stripe_subscription_id?: string | null;
};

export async function runLifecycleEmails(opts: {
  currency: Currency;
  dryRun: boolean;
  // Return false to skip the renewal notice (e.g. a Stripe plan set to cancel).
  renewalApplies?: (org: LifecycleOrg) => Promise<boolean>;
}) {
  const { currency, dryRun } = opts;
  const planned: { org: string; kind: string }[] = [];
  const send: typeof sendOwnerEmailOnce = async (kind, o, ctx, key) => {
    if (dryRun) {
      planned.push({ org: o.name, kind });
      return true;
    }
    return sendOwnerEmailOnce(kind, o, ctx, key);
  };

  const { data: orgs, error } = await createServiceClient()
    .from("organizations")
    .select(
      "id, name, slug, email, billing_tier, billing_status, current_period_end, signup_date, last_paid_at, self_serve, billing_currency, stripe_subscription_id"
    )
    .eq("self_serve", true)
    .eq("is_active", true)
    .eq("billing_currency", currency);
  if (error) throw new Error(error.message);

  const now = Date.now();
  const sent: Record<string, number> = {};
  const bump = (k: string) => (sent[k] = (sent[k] || 0) + 1);

  for (const org of (orgs || []) as LifecycleOrg[]) {
    const paid = isPaid(org);
    const periodEnd = org.current_period_end ? new Date(org.current_period_end).getTime() : null;
    const emailOrg = { id: org.id, name: org.name, slug: org.slug, email: org.email };
    const price = tierPriceFor("builder", org);
    const base = { price, currency };

    // 1. The 7-day series: never-paid owners on the pay-to-publish model. Each
    //    email goes on its day, or the day after if a run was missed.
    if (!paid && !org.last_paid_at && org.signup_date && org.signup_date >= PAY_TO_PUBLISH_FROM) {
      const daysIn = Math.floor((now - new Date(org.signup_date).getTime()) / DAY);
      const due = NUDGE_DAYS.find((d) => daysIn === d || daysIn === d + 1);
      if (due) {
        const firstQuizAt = await firstBuilderQuizAt(org.id);
        const offer = goLiveOffer(org, firstQuizAt);
        const kind = `nudge_d${due}` as OwnerEmailKind;
        if (await send(kind, emailOrg, { hasQuiz: !!firstQuizAt, offerEndsAt: offer.endsAt, ...base })) bump(kind);
      }
    }

    // 1b. "Who it's for": what they've enrolled in, paid or not, once.
    if (org.signup_date && org.signup_date >= WHO_ITS_FOR_FROM) {
      const daysIn = Math.floor((now - new Date(org.signup_date).getTime()) / DAY);
      if (daysIn >= WHO_ITS_FOR_DAY && daysIn <= WHO_ITS_FOR_DAY + 7) {
        const hasQuiz = !!(await firstBuilderQuizAt(org.id));
        if (await send("who_its_for", emailOrg, { hasQuiz, offerEndsAt: null, ...base })) bump("who_its_for");
      }
    }

    // 2. Renewal notice: paid plan ending within 3 days (once per period).
    if (paid && periodEnd && periodEnd - now <= RENEWAL_NOTICE_DAYS * DAY && (!opts.renewalApplies || (await opts.renewalApplies(org)))) {
      const ok = await send(
        "renewal_due",
        emailOrg,
        { hasQuiz: true, offerEndsAt: null, periodEnd: org.current_period_end, ...base },
        org.current_period_end ?? ""
      );
      if (ok) bump("renewal_due");
    }

    // 3. Lapsed: was paid, period ended without a renewal (once per period).
    if (!paid && org.last_paid_at && periodEnd && periodEnd < now && now - periodEnd <= LAPSED_WINDOW_DAYS * DAY) {
      const ok = await send(
        "lapsed",
        emailOrg,
        { hasQuiz: true, offerEndsAt: null, periodEnd: org.current_period_end, ...base },
        org.current_period_end ?? ""
      );
      if (ok) bump("lapsed");
    }
  }

  return { orgs: orgs?.length ?? 0, sent, ...(dryRun ? { planned } : {}) };
}

// Shared cron guard: Vercel sends "Bearer CRON_SECRET". ?dryRun=1 lists what
// would happen without doing it (production needs the secret, since it shows
// owner names).
export function cronGate(request: Request): { error?: { message: string; status: number }; dryRun: boolean } {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return { error: { message: "Unauthorized", status: 401 }, dryRun: false };
  }
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  if (dryRun && !secret && process.env.NODE_ENV === "production") {
    return { error: { message: "Dry run needs CRON_SECRET in production", status: 403 }, dryRun };
  }
  return { dryRun };
}
