import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { PAY_TO_PUBLISH_FROM, goLiveOffer, isPaid, tierPriceFor, type OrgBilling } from "@/lib/paystack";
import { firstBuilderQuizAt } from "@/lib/go-live";
import { sendOwnerEmailOnce, type OwnerEmailKind } from "@/lib/builder-emails";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY = 24 * 3600 * 1000;
// 7-day series for self-serve owners who haven't paid (welcome is sent at sign-up).
const NUDGE_DAYS = [1, 3, 5, 7] as const;
// "Who it's for" goes out on day 2 to owners who signed up after it launched.
const WHO_ITS_FOR_DAY = 2;
const WHO_ITS_FOR_FROM = "2026-09-28T11:30:00Z";
const RENEWAL_NOTICE_DAYS = 3;
const LAPSED_WINDOW_DAYS = 7;

type Org = OrgBilling & { id: string; name: string; slug: string; email: string | null };

// Daily (Vercel cron, 07:00 UTC = 08:00 Lagos). Safe to run more often: every
// email is logged once per org, so re-runs never send duplicates.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ?dryRun=1 lists what would send without sending (never on production
  // without the cron secret, since it shows owner emails).
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  if (dryRun && !secret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dry run needs CRON_SECRET in production" }, { status: 403 });
  }
  const planned: { org: string; kind: string }[] = [];
  const send: typeof sendOwnerEmailOnce = async (kind, o, ctx, key) => {
    if (dryRun) {
      planned.push({ org: o.name, kind });
      return true;
    }
    return sendOwnerEmailOnce(kind, o, ctx, key);
  };

  const supabase = createServiceClient();
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, name, slug, email, billing_tier, billing_status, current_period_end, signup_date, last_paid_at, self_serve")
    .eq("self_serve", true)
    .eq("is_active", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  const sent: Record<string, number> = {};
  const bump = (k: string) => (sent[k] = (sent[k] || 0) + 1);

  for (const org of (orgs || []) as Org[]) {
    const paid = isPaid(org);
    const periodEnd = org.current_period_end ? new Date(org.current_period_end).getTime() : null;
    const emailOrg = { id: org.id, name: org.name, slug: org.slug, email: org.email };
    const price = tierPriceFor("builder", org);

    // 1. The 7-day series: never-paid owners on the pay-to-publish model. Each
    //    email goes on its day, or the day after if a run was missed.
    if (!paid && !org.last_paid_at && org.signup_date && org.signup_date >= PAY_TO_PUBLISH_FROM) {
      const daysIn = Math.floor((now - new Date(org.signup_date).getTime()) / DAY);
      const due = NUDGE_DAYS.find((d) => daysIn === d || daysIn === d + 1);
      if (due) {
        const firstQuizAt = await firstBuilderQuizAt(org.id);
        const offer = goLiveOffer(org, firstQuizAt);
        const kind = `nudge_d${due}` as OwnerEmailKind;
        if (await send(kind, emailOrg, { hasQuiz: !!firstQuizAt, offerEndsAt: offer.endsAt, price })) bump(kind);
      }
    }

    // 1b. "Who it's for": what they've enrolled in, paid or not, once.
    if (org.signup_date && org.signup_date >= WHO_ITS_FOR_FROM) {
      const daysIn = Math.floor((now - new Date(org.signup_date).getTime()) / DAY);
      if (daysIn >= WHO_ITS_FOR_DAY && daysIn <= WHO_ITS_FOR_DAY + 7) {
        const hasQuiz = !!(await firstBuilderQuizAt(org.id));
        if (await send("who_its_for", emailOrg, { hasQuiz, offerEndsAt: null, price })) bump("who_its_for");
      }
    }

    // 2. Renewal reminder: paid plan ending within 3 days (once per period).
    if (paid && periodEnd && periodEnd - now <= RENEWAL_NOTICE_DAYS * DAY) {
      const ok = await send(
        "renewal_due",
        emailOrg,
        { hasQuiz: true, offerEndsAt: null, periodEnd: org.current_period_end, price },
        org.current_period_end ?? ""
      );
      if (ok) bump("renewal_due");
    }

    // 3. Lapsed: was paid, period ended without a renewal (once per period).
    if (!paid && org.last_paid_at && periodEnd && periodEnd < now && now - periodEnd <= LAPSED_WINDOW_DAYS * DAY) {
      const ok = await send(
        "lapsed",
        emailOrg,
        { hasQuiz: true, offerEndsAt: null, periodEnd: org.current_period_end, price },
        org.current_period_end ?? ""
      );
      if (ok) bump("lapsed");
    }
  }

  console.log("[cron/builder-emails]", JSON.stringify({ orgs: orgs?.length ?? 0, sent }));
  return NextResponse.json({ ok: true, dryRun, orgs: orgs?.length ?? 0, sent, ...(dryRun ? { planned } : {}) });
}
