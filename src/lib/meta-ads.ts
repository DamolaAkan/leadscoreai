// Press-play: one Meta campaign per customer, run from our own ad account.
// Nothing here spends on its own: everything is created PAUSED, and going live is
// the separate activateCampaign call, made only when the customer presses play.
//
// Money is in kobo, which is Meta's unit for NGN accounts (a 900000 budget showed
// as ₦9,000 in the test of 2026-11-05).

const API_VERSION = process.env.META_GRAPH_VERSION || "v24.0";
const GRAPH = `https://graph.facebook.com/${API_VERSION}`;

export class MetaAdsError extends Error {
  status: number;
  // What already exists when a multi-step create fails, so it can be cleaned up.
  created: Partial<CampaignIds>;

  constructor(message: string, status: number, created: Partial<CampaignIds> = {}) {
    super(message);
    this.name = "MetaAdsError";
    this.status = status;
    this.created = created;
  }
}

export interface CampaignIds {
  campaignId: string;
  adSetId: string;
  creativeId: string;
  adId: string;
}

export function metaAdsConfigured(): boolean {
  return Boolean(process.env.META_ADS_TOKEN);
}

// Where customer campaigns run. IDs, not secrets. CarPapers for now (Damola,
// 2026-11-05); another account can take new customers later.
export const META_AD_ACCOUNT_ID = process.env.META_ADS_ACCOUNT_ID || "778744490700152";
export const META_PAGE_ID = process.env.META_ADS_PAGE_ID || "340255695831044";

// The token goes in a header, so it never appears in a URL or a log line.
async function graph<T>(path: string, init: { method: "GET" | "POST"; params?: Record<string, unknown> }): Promise<T> {
  const token = process.env.META_ADS_TOKEN;
  if (!token) throw new MetaAdsError("META_ADS_TOKEN is not set", 503);

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  let url = `${GRAPH}/${path}`;
  let body: string | undefined;
  if (init.method === "GET") {
    const q = new URLSearchParams(Object.entries(init.params ?? {}).map(([k, v]) => [k, String(v)])).toString();
    if (q) url += `?${q}`;
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.params ?? {});
  }

  const res = await fetch(url, { method: init.method, headers, body });
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } } & T;
  if (!res.ok || data.error) {
    throw new MetaAdsError(data.error?.message || `Meta returned HTTP ${res.status}`, res.status);
  }
  return data;
}

export interface CreateCampaignInput {
  adAccountId: string; // numeric, without "act_"
  pageId: string;
  // With a pixel, Meta optimises for website leads. Without one, for link clicks,
  // because the Lead event can't be seen until the pixel is on the scorecard page.
  pixelId?: string | null;
  name: string;
  geoLocations: Record<string, unknown>;
  lifetimeBudgetKobo: number;
  endTime: Date;
  scorecardUrl: string; // the customer's own scorecard page
  imageHash: string;
  message: string;
  headline: string;
}

// Campaign, ad set, creative and ad, in that order and all PAUSED.
export async function createCustomerCampaign(input: CreateCampaignInput): Promise<CampaignIds> {
  const act = `act_${input.adAccountId}`;
  const created: Partial<CampaignIds> = {};
  try {
    const campaign = await graph<{ id: string }>(`${act}/campaigns`, {
      method: "POST",
      params: {
        name: input.name,
        objective: "OUTCOME_LEADS",
        buying_type: "AUCTION",
        status: "PAUSED",
        special_ad_categories: [],
        is_adset_budget_sharing_enabled: false,
      },
    });
    created.campaignId = campaign.id;

    const adSet = await graph<{ id: string }>(`${act}/adsets`, {
      method: "POST",
      params: {
        name: input.name,
        campaign_id: campaign.id,
        status: "PAUSED",
        // The hard stop: Meta won't charge above this. See metaLifetimeBudgetKobo.
        lifetime_budget: input.lifetimeBudgetKobo,
        end_time: input.endTime.toISOString(),
        billing_event: "IMPRESSIONS",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        ...(input.pixelId
          ? {
              optimization_goal: "OFFSITE_CONVERSIONS",
              promoted_object: { pixel_id: input.pixelId, custom_event_type: "LEAD" },
            }
          : { optimization_goal: "LINK_CLICKS" }),
        destination_type: "WEBSITE",
        targeting: { geo_locations: input.geoLocations },
      },
    });
    created.adSetId = adSet.id;

    const creative = await graph<{ id: string }>(`${act}/adcreatives`, {
      method: "POST",
      params: {
        name: input.name,
        url_tags: "utm_source=meta&utm_medium=paid&utm_campaign={{campaign.id}}&utm_content={{ad.id}}",
        object_story_spec: {
          page_id: input.pageId,
          link_data: {
            link: input.scorecardUrl,
            image_hash: input.imageHash,
            message: input.message,
            name: input.headline,
            call_to_action: { type: "LEARN_MORE", value: { link: input.scorecardUrl } },
          },
        },
      },
    });
    created.creativeId = creative.id;

    const ad = await graph<{ id: string }>(`${act}/ads`, {
      method: "POST",
      params: { name: input.name, adset_id: adSet.id, creative: { creative_id: creative.id }, status: "PAUSED" },
    });
    created.adId = ad.id;

    return created as CampaignIds;
  } catch (e) {
    if (e instanceof MetaAdsError) throw new MetaAdsError(e.message, e.status, created);
    throw e;
  }
}

async function setStatus(id: string, status: "ACTIVE" | "PAUSED"): Promise<void> {
  await graph(id, { method: "POST", params: { status } });
}

// Press play, or resume. Inner levels first, so nothing is live until all of it is ready.
export async function activateCampaign(ids: Pick<CampaignIds, "campaignId" | "adSetId" | "adId">): Promise<void> {
  await setStatus(ids.adId, "ACTIVE");
  await setStatus(ids.adSetId, "ACTIVE");
  await setStatus(ids.campaignId, "ACTIVE");
}

// Pausing the campaign alone stops delivery, so one call is the whole action.
export async function pauseCampaign(campaignId: string): Promise<void> {
  await setStatus(campaignId, "PAUSED");
}

// At a top-up or on resume: the new ceiling and the end date that paces it.
export async function setLifetimeBudget(adSetId: string, lifetimeBudgetKobo: number, endTime: Date): Promise<void> {
  await graph(adSetId, {
    method: "POST",
    params: { lifetime_budget: lifetimeBudgetKobo, end_time: endTime.toISOString() },
  });
}

export interface DailySpend {
  date: string; // YYYY-MM-DD in the ad account's time zone
  spendKobo: number;
  impressions: number;
  clicks: number;
}

// One row per day the campaign ran.
export async function getCampaignDaily(campaignId: string): Promise<DailySpend[]> {
  const res = await graph<{
    data?: { date_start?: string; spend?: string; impressions?: string; inline_link_clicks?: string }[];
  }>(`${campaignId}/insights`, {
    method: "GET",
    params: { date_preset: "maximum", time_increment: 1, fields: "spend,impressions,inline_link_clicks", limit: 500 },
  });
  return (res.data || [])
    .filter((r) => r.date_start)
    .map((r) => ({
      date: r.date_start as string,
      spendKobo: nairaStringToKobo(r.spend),
      impressions: Number(r.impressions) || 0,
      clicks: Number(r.inline_link_clicks) || 0,
    }));
}

// The ad's own status shows review: PENDING_REVIEW, ACTIVE, DISAPPROVED and so on.
export async function getAdStatus(adId: string): Promise<string> {
  const res = await graph<{ effective_status?: string }>(adId, { method: "GET", params: { fields: "effective_status" } });
  return res.effective_status || "UNKNOWN";
}

export interface AccessCheck {
  step: string;
  ok: boolean;
  detail: Record<string, unknown> | string;
}

// Read-only: can the token see the ad account and the Page? Changes nothing.
export async function checkMetaAccess(): Promise<AccessCheck[]> {
  const checks: { step: string; path: string; fields: string }[] = [
    { step: "token", path: "me", fields: "id,name" },
    {
      step: "ad_account",
      path: `act_${META_AD_ACCOUNT_ID}`,
      fields: "name,account_status,currency,disable_reason,amount_spent,spend_cap",
    },
    { step: "page", path: META_PAGE_ID, fields: "id,name" },
  ];
  const out: AccessCheck[] = [];
  for (const c of checks) {
    try {
      const detail = await graph<Record<string, unknown>>(c.path, { method: "GET", params: { fields: c.fields } });
      out.push({ step: c.step, ok: true, detail });
    } catch (e) {
      out.push({ step: c.step, ok: false, detail: e instanceof Error ? e.message : "Unknown error" });
    }
  }
  return out;
}

export function nairaStringToKobo(spend: string | undefined): number {
  const n = Number(spend);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

export interface CampaignSpend {
  spendKobo: number;
  impressions: number;
  clicks: number;
}

// Total for the campaign's whole life. No row means it hasn't spent anything.
export async function getCampaignSpend(campaignId: string): Promise<CampaignSpend> {
  const res = await graph<{ data?: { spend?: string; impressions?: string; clicks?: string }[] }>(
    `${campaignId}/insights`,
    { method: "GET", params: { date_preset: "maximum", fields: "spend,impressions,clicks" } }
  );
  const row = res.data?.[0];
  return {
    spendKobo: nairaStringToKobo(row?.spend),
    impressions: Number(row?.impressions) || 0,
    clicks: Number(row?.clicks) || 0,
  };
}
