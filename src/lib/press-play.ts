// Press-play, server side: what a customer has paid and spent, and the play,
// pause and top-up actions on their one Meta campaign.
//
// The balance shown is credits minus live Meta spend x the campaign multiplier.
// Meta's own spend is the truth, so it stays right whether or not the spend sync
// has started writing ad_charge lines (it runs in shadow mode for now). Those
// lines, when they start, are the bookkeeping record, not the balance.
import { createServiceClient } from "./supabase";
import { validateSession, getSessionIdFromRequest, hasRole } from "./auth";
import type { AuthUser } from "./dashboard-types";
import {
  META_AD_ACCOUNT_ID,
  META_PAGE_ID,
  activateCampaign,
  createCustomerCampaign,
  getAdStatus,
  getCampaignDaily,
  getCampaignSpend,
  metaAdsConfigured,
  pauseCampaign,
  setLifetimeBudget,
} from "./meta-ads";
import { AREAS, DEFAULT_INSTALLER_CAP, PRESS_PLAY_PIXEL_ID, geoFor } from "./press-play-config";
import { DEFAULT_MULTIPLIER, campaignEndTime, metaLifetimeBudgetKobo } from "./wallet-math";
import { canPublish, type OrgBilling } from "./paystack";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.leadscoreai.com";
// The least a campaign may have left to spend: above Meta's ₦1,345.70 daily minimum.
export const MIN_BUDGET_LEFT_KOBO = 1_500 * 100;
const LIVE = ["in_review", "active"];

export class PressPlayError extends Error {
  constructor(message: string, public code: string, public status = 400) {
    super(message);
  }
}

// The customer's own ad: fixed copy and image, never editable by them.
export function adConfig() {
  const imageHash = process.env.PRESS_PLAY_AD_IMAGE_HASH;
  const message = process.env.PRESS_PLAY_AD_MESSAGE;
  const headline = process.env.PRESS_PLAY_AD_HEADLINE;
  if (!imageHash || !message || !headline) return null;
  return { imageHash, message, headline, pixelId: PRESS_PLAY_PIXEL_ID };
}

// The pixel a public scorecard should load, or null. Only scorecards that have
// had a press-play campaign carry it, so client scorecards stay untouched.
export async function pressPlayPixelFor(quizId: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from("ad_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId)
    .not("meta_campaign_id", "is", null);
  return count ? PRESS_PLAY_PIXEL_ID : null;
}

// Owners only, the same rule as billing.
export async function orgOwnerFromRequest(request: Request): Promise<AuthUser | null> {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return null;
  const user = await validateSession(sessionId);
  return user && hasRole(user, "superadmin") ? user : null;
}

interface CampaignRow {
  id: string;
  quiz_id: string;
  status: string;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  daily_budget_kobo: number;
  price_multiplier: number;
  created_at: string;
}

const CAMPAIGN_FIELDS =
  "id, quiz_id, status, meta_campaign_id, meta_adset_id, meta_ad_id, daily_budget_kobo, price_multiplier, created_at";

export async function orgPosition(orgId: string) {
  const supabase = createServiceClient();
  const [{ data: wallet }, { data: rows, error }] = await Promise.all([
    supabase.from("ad_wallet_balances").select("credited_kobo").eq("organization_id", orgId).maybeSingle(),
    supabase.from("ad_campaigns").select(CAMPAIGN_FIELDS).eq("organization_id", orgId).order("created_at", { ascending: false }),
  ]);
  if (error) throw new Error(`[press-play] campaigns read failed: ${error.message}`);

  const campaigns: { row: CampaignRow; spendKobo: number }[] = [];
  for (const row of (rows || []) as CampaignRow[]) {
    const spendKobo =
      row.meta_campaign_id && metaAdsConfigured() ? (await getCampaignSpend(row.meta_campaign_id)).spendKobo : 0;
    campaigns.push({ row, spendKobo });
  }
  const creditedKobo = Number(wallet?.credited_kobo ?? 0);
  const spentKobo = campaigns.reduce(
    (s, c) => s + Math.round(c.spendKobo * Number(c.row.price_multiplier || DEFAULT_MULTIPLIER)),
    0
  );
  return { creditedKobo, spentKobo, balanceKobo: Math.max(0, creditedKobo - spentKobo), campaigns };
}

function budgetFor(spendKobo: number, balanceKobo: number, row: Pick<CampaignRow, "price_multiplier" | "daily_budget_kobo">) {
  const lifetime = metaLifetimeBudgetKobo({
    metaSpendTotalKobo: spendKobo,
    balanceKobo,
    multiplier: Number(row.price_multiplier || DEFAULT_MULTIPLIER),
  });
  const left = lifetime - spendKobo;
  return { lifetime, left, end: campaignEndTime({ now: new Date(), budgetLeftKobo: left, dailyBudgetKobo: Number(row.daily_budget_kobo) }) };
}

async function areaIds(slugs: string[]): Promise<Map<string, string>> {
  const supabase = createServiceClient();
  const wanted = AREAS.filter((a) => slugs.includes(a.slug));
  const { data, error } = await supabase
    .from("ad_areas")
    .upsert(
      wanted.map((a) => ({ slug: a.slug, name: a.name, meta_geo: a.geo, installer_cap: DEFAULT_INSTALLER_CAP })),
      { onConflict: "slug", ignoreDuplicates: true }
    )
    .select("id, slug");
  if (error) throw new Error(`[press-play] areas failed: ${error.message}`);
  const found = new Map((data || []).map((r) => [r.slug as string, r.id as string]));
  if (found.size < wanted.length) {
    const { data: existing } = await supabase.from("ad_areas").select("id, slug").in("slug", slugs);
    for (const r of existing || []) found.set(r.slug as string, r.id as string);
  }
  return found;
}

// No area takes more running installers than its cap.
async function assertAreaRoom(orgId: string, ids: string[]) {
  const supabase = createServiceClient();
  const { data: areas } = await supabase.from("ad_areas").select("id, name, installer_cap").in("id", ids);
  const { data: links } = await supabase
    .from("ad_campaign_areas")
    .select("area_id, ad_campaigns!inner(organization_id, status)")
    .in("area_id", ids)
    .in("ad_campaigns.status", LIVE)
    .neq("ad_campaigns.organization_id", orgId);
  for (const a of areas || []) {
    const running = (links || []).filter((l) => l.area_id === a.id).length;
    if (running >= Number(a.installer_cap)) {
      throw new PressPlayError(`${a.name} is full right now. Pick another area.`, "area_full");
    }
  }
}

export async function play(user: AuthUser, quizId: string, areaSlugs: string[]) {
  const ad = adConfig();
  if (!ad) throw new PressPlayError("Campaigns aren't open yet.", "ad_not_ready", 503);
  if (!metaAdsConfigured()) throw new PressPlayError("Campaigns aren't open yet.", "meta_not_ready", 503);
  const slugs = Array.from(new Set(areaSlugs)).filter((s) => AREAS.some((a) => a.slug === s));
  if (!slugs.length) throw new PressPlayError("Pick at least one area.", "no_area");

  const supabase = createServiceClient();
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, slug, is_active")
    .eq("id", quizId)
    .eq("organization_id", user.organizationId)
    .maybeSingle();
  if (!quiz || !quiz.is_active) throw new PressPlayError("Pick one of your live scorecards.", "no_scorecard");
  // The ad must land on a page that loads: unpaid builder accounts' scorecards don't.
  const { data: orgRow } = await supabase.from("organizations").select("*").eq("id", user.organizationId).single();
  if (!canPublish(orgRow as OrgBilling)) {
    throw new PressPlayError("Your scorecard isn't live on this account. Contact us to switch it on.", "not_publishable");
  }

  const position = await orgPosition(user.organizationId);
  if (position.campaigns.some((c) => LIVE.includes(c.row.status))) {
    throw new PressPlayError("Your campaign is already running.", "already_running");
  }

  // Resume the paused campaign for this scorecard, if there is one.
  const paused = position.campaigns.find(
    (c) => c.row.quiz_id === quizId && ["paused", "out_of_balance"].includes(c.row.status) && c.row.meta_ad_id
  );
  if (paused) {
    const b = budgetFor(paused.spendKobo, position.balanceKobo, paused.row);
    if (b.left < MIN_BUDGET_LEFT_KOBO) throw new PressPlayError("Top up to keep going.", "low_balance");
    await setLifetimeBudget(paused.row.meta_adset_id as string, b.lifetime, b.end);
    await activateCampaign({
      campaignId: paused.row.meta_campaign_id as string,
      adSetId: paused.row.meta_adset_id as string,
      adId: paused.row.meta_ad_id as string,
    });
    await supabase
      .from("ad_campaigns")
      .update({ status: "active", pause_reason: null, meta_spend_limit_kobo: b.lifetime, updated_at: new Date().toISOString() })
      .eq("id", paused.row.id);
    return { campaignId: paused.row.id, resumed: true };
  }

  const ids = await areaIds(slugs);
  await assertAreaRoom(user.organizationId, Array.from(ids.values()));
  const defaults = { price_multiplier: DEFAULT_MULTIPLIER, daily_budget_kobo: 1_000_000 };
  const b = budgetFor(0, position.balanceKobo, defaults);
  if (b.left < MIN_BUDGET_LEFT_KOBO) throw new PressPlayError("Top up to press play.", "low_balance");

  // Taking the live slot first: the one-live-campaign index stops a double click.
  const { data: row, error } = await supabase
    .from("ad_campaigns")
    .insert({
      organization_id: user.organizationId,
      quiz_id: quizId,
      status: "in_review",
      meta_ad_account_id: META_AD_ACCOUNT_ID,
      meta_spend_limit_kobo: b.lifetime,
      ...defaults,
    })
    .select("id")
    .single();
  if (error || !row) {
    if (error?.code === "23505") throw new PressPlayError("Your campaign is already running.", "already_running");
    throw new Error(`[press-play] campaign insert failed: ${error?.message}`);
  }
  await supabase.from("ad_campaign_areas").insert(Array.from(ids.values()).map((area_id) => ({ campaign_id: row.id, area_id })));

  let metaIds: Partial<{ campaignId: string; adSetId: string; adId: string }> = {};
  try {
    const created = await createCustomerCampaign({
      adAccountId: META_AD_ACCOUNT_ID,
      pageId: META_PAGE_ID,
      pixelId: ad.pixelId,
      name: `${user.orgName} - ${quiz.slug}`,
      geoLocations: geoFor(slugs),
      lifetimeBudgetKobo: b.lifetime,
      endTime: b.end,
      scorecardUrl: `${APP_URL}/${user.orgSlug}/${quiz.slug}`,
      imageHash: ad.imageHash,
      message: ad.message,
      headline: ad.headline,
    });
    metaIds = created;
    await supabase
      .from("ad_campaigns")
      .update({
        meta_campaign_id: created.campaignId,
        meta_adset_id: created.adSetId,
        meta_ad_id: created.adId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    await activateCampaign(created);
    return { campaignId: row.id, resumed: false };
  } catch (e) {
    const created = (e as { created?: typeof metaIds }).created ?? metaIds;
    if (created.campaignId) await pauseCampaign(created.campaignId).catch(() => undefined);
    await supabase
      .from("ad_campaigns")
      .update({
        status: "error",
        pause_reason: e instanceof Error ? e.message.slice(0, 500) : "Unknown error",
        meta_campaign_id: created.campaignId ?? null,
        meta_adset_id: created.adSetId ?? null,
        meta_ad_id: created.adId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    throw new PressPlayError("We couldn't start your campaign. Our team has been told.", "meta_error", 502);
  }
}

export async function pause(user: AuthUser) {
  const supabase = createServiceClient();
  const { data: live } = await supabase
    .from("ad_campaigns")
    .select("id, meta_campaign_id")
    .eq("organization_id", user.organizationId)
    .in("status", LIVE)
    .maybeSingle();
  if (!live) throw new PressPlayError("Nothing is running.", "not_running");
  if (live.meta_campaign_id) await pauseCampaign(live.meta_campaign_id);
  await supabase
    .from("ad_campaigns")
    .update({ status: "paused", pause_reason: "paused by customer", updated_at: new Date().toISOString() })
    .eq("id", live.id);
}

// After a top-up: raise the running campaign's ceiling to what the new balance buys.
export async function refreshBudget(orgId: string) {
  if (!metaAdsConfigured()) return;
  const position = await orgPosition(orgId);
  const live = position.campaigns.find((c) => LIVE.includes(c.row.status) && c.row.meta_adset_id);
  if (!live) return;
  const b = budgetFor(live.spendKobo, position.balanceKobo, live.row);
  if (b.left < MIN_BUDGET_LEFT_KOBO) return;
  await setLifetimeBudget(live.row.meta_adset_id as string, b.lifetime, b.end);
  const supabase = createServiceClient();
  await supabase.from("ad_campaigns").update({ meta_spend_limit_kobo: b.lifetime, updated_at: new Date().toISOString() }).eq("id", live.row.id);
}

export interface DayPoint {
  date: string; // YYYY-MM-DD, Lagos
  spentKobo: number; // what the customer pays: Meta spend x multiplier
  leads: number;
  qualified: number; // Hot and Warm
  impressions: number;
  clicks: number;
}

const lagosDay = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });

// Day by day since the first campaign: spend at the customer's price, leads, and
// qualified leads. Days with nothing are kept as zeros so the chart has no gaps.
async function dailySeries(orgId: string, campaigns: { row: CampaignRow }[]): Promise<DayPoint[]> {
  if (!campaigns.length) return [];
  const first = campaigns.reduce((a, c) => (c.row.created_at < a ? c.row.created_at : a), campaigns[0].row.created_at);
  const days = new Map<string, DayPoint>();
  const day = (date: string) => {
    if (!days.has(date)) days.set(date, { date, spentKobo: 0, leads: 0, qualified: 0, impressions: 0, clicks: 0 });
    return days.get(date) as DayPoint;
  };
  for (let t = new Date(lagosDay(first)).getTime(); t <= new Date(lagosDay(new Date())).getTime(); t += 86_400_000) {
    day(new Date(t).toISOString().slice(0, 10));
  }

  if (metaAdsConfigured()) {
    for (const c of campaigns) {
      if (!c.row.meta_campaign_id) continue;
      const mult = Number(c.row.price_multiplier || DEFAULT_MULTIPLIER);
      for (const r of await getCampaignDaily(c.row.meta_campaign_id)) {
        const p = day(r.date);
        p.spentKobo += Math.round(r.spendKobo * mult);
        p.impressions += r.impressions;
        p.clicks += r.clicks;
      }
    }
  }

  const supabase = createServiceClient();
  const quizIds = Array.from(new Set(campaigns.map((c) => c.row.quiz_id)));
  const { data: rows } = await supabase
    .from("quiz_responses")
    .select("created_at, qualification")
    .eq("organization_id", orgId)
    .in("quiz_id", quizIds)
    .gte("created_at", first)
    .not("completed_at", "is", null)
    .limit(10000);
  for (const r of rows || []) {
    const p = day(lagosDay(r.created_at as string));
    p.leads += 1;
    if (r.qualification === "HOT_LEAD" || r.qualification === "WARM_LEAD") p.qualified += 1;
  }

  return Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
}

const REVIEW_STATUS: Record<string, string> = {
  PENDING_REVIEW: "in_review",
  IN_PROCESS: "in_review",
  ACTIVE: "active",
  DISAPPROVED: "rejected",
};

export async function state(user: AuthUser) {
  const supabase = createServiceClient();
  const position = await orgPosition(user.organizationId);
  const latest = position.campaigns[0];

  let status = latest?.row.status ?? "none";
  if (latest && LIVE.includes(status) && latest.row.meta_ad_id && metaAdsConfigured()) {
    const next = REVIEW_STATUS[await getAdStatus(latest.row.meta_ad_id).catch(() => "")];
    if (next && next !== status) {
      status = next;
      await supabase.from("ad_campaigns").update({ status: next, updated_at: new Date().toISOString() }).eq("id", latest.row.id);
    }
  }
  if (status === "active" && budgetFor(latest.spendKobo, position.balanceKobo, latest.row).left < MIN_BUDGET_LEFT_KOBO) {
    status = "out_of_balance"; // Meta stops at the lifetime budget on its own
  }

  const [{ data: quizzes }, { data: ledger }, leads, areaRows] = await Promise.all([
    supabase.from("quizzes").select("id, name, slug").eq("organization_id", user.organizationId).eq("is_active", true),
    supabase
      .from("ad_wallet_ledger")
      .select("id, kind, amount_kobo, created_at")
      .eq("organization_id", user.organizationId)
      .in("kind", ["topup", "trial"])
      .order("created_at", { ascending: false })
      .limit(20),
    latest
      ? supabase
          .from("quiz_responses")
          .select("id", { count: "exact", head: true })
          .eq("quiz_id", latest.row.quiz_id)
          .gte("created_at", latest.row.created_at)
          .not("completed_at", "is", null)
      : Promise.resolve({ count: 0 }),
    latest
      ? supabase.from("ad_campaign_areas").select("ad_areas(slug)").eq("campaign_id", latest.row.id)
      : Promise.resolve({ data: [] }),
  ]);

  const day = (d: string | Date) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const activity = [
    ...(position.spentKobo > 0 ? [{ id: "spend", label: "Ad spend so far", amountKobo: -position.spentKobo, date: day(new Date()) }] : []),
    ...(ledger || []).map((l) => ({
      id: l.id as string,
      label: l.kind === "trial" ? "Free trial credit" : "Top-up",
      amountKobo: Number(l.amount_kobo),
      date: day(l.created_at as string),
    })),
  ];

  const daily = await dailySeries(user.organizationId, position.campaigns).catch((e) => {
    console.error("[press-play] daily series failed:", e);
    return [] as DayPoint[];
  });

  return {
    balanceKobo: position.balanceKobo,
    spentKobo: position.spentKobo,
    daily,
    activity,
    ready: Boolean(adConfig()) && metaAdsConfigured(),
    areas: AREAS.map((a) => ({ slug: a.slug, name: a.name })),
    quizzes: (quizzes || []).map((q) => ({ id: q.id as string, name: q.name as string })),
    campaign: latest
      ? {
          status,
          quizId: latest.row.quiz_id,
          areas: ((areaRows.data || []) as { ad_areas: { slug: string } | { slug: string }[] | null }[])
            .flatMap((r) => (Array.isArray(r.ad_areas) ? r.ad_areas : r.ad_areas ? [r.ad_areas] : []))
            .map((a) => a.slug),
          leads: leads.count ?? 0,
          since: day(latest.row.created_at),
        }
      : null,
  };
}
