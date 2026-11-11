-- LeadScoreAI press-play campaigns: wallet, per-customer Meta campaigns, spend log.
-- Applied to the live database 2026-11-05 on Damola's explicit OK.
-- Additive only: new tables and one view. No existing table is changed.
-- All money is in kobo. RLS on with no policies: service role only, like the rest of the app.

-- Installer cap per area lives here so it can change without a release.
create table public.ad_areas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  meta_geo jsonb not null default '{}'::jsonb,
  installer_cap integer not null default 5 check (installer_cap > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One Meta campaign per customer, pointing at that customer's own scorecard.
create table public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  quiz_id uuid not null references public.quizzes(id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'active', 'paused', 'out_of_balance', 'rejected', 'error')),
  pause_reason text,
  meta_ad_account_id text,
  meta_campaign_id text unique,
  meta_adset_id text,
  meta_ad_id text,
  daily_budget_kobo bigint not null default 1000000 check (daily_budget_kobo > 0),
  -- What the customer pays per unit of Meta spend, fixed per campaign so a later
  -- change of split never rewrites what an existing campaign has already charged.
  price_multiplier numeric(4,2) not null default 2.00 check (price_multiplier >= 1),
  meta_spend_limit_kobo bigint,
  meta_spend_total_kobo bigint not null default 0 check (meta_spend_total_kobo >= 0),
  charged_total_kobo bigint not null default 0 check (charged_total_kobo >= 0),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A customer has one running campaign at a time.
create unique index ad_campaigns_one_live_per_org
  on public.ad_campaigns (organization_id)
  where status in ('in_review', 'active');
create index ad_campaigns_org_idx on public.ad_campaigns (organization_id, created_at desc);

-- A campaign can cover several areas; each counts towards that area's cap.
create table public.ad_campaign_areas (
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  area_id uuid not null references public.ad_areas(id) on delete restrict,
  primary key (campaign_id, area_id)
);
create index ad_campaign_areas_area_idx on public.ad_campaign_areas (area_id);

-- The balance is the sum of these lines. Lines are never edited.
create table public.ad_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  kind text not null check (kind in ('topup', 'trial', 'ad_charge', 'adjustment')),
  amount_kobo bigint not null,
  -- Top-ups: what was actually paid, and the 7.5% VAT inside it. VAT is not balance.
  vat_kobo bigint check (vat_kobo >= 0),
  paid_kobo bigint check (paid_kobo >= 0),
  paystack_ref text unique,
  -- Charges: the running Meta total this line brings the campaign up to.
  campaign_id uuid references public.ad_campaigns(id) on delete restrict,
  meta_spend_total_kobo bigint,
  note text,
  created_at timestamptz not null default now(),
  check (
    (kind in ('topup', 'trial') and amount_kobo > 0)
    or (kind = 'ad_charge' and amount_kobo < 0 and campaign_id is not null and meta_spend_total_kobo is not null)
    or kind = 'adjustment'
  ),
  check (kind <> 'topup' or (paystack_ref is not null and paid_kobo is not null and vat_kobo is not null))
);
create index ad_wallet_ledger_org_idx on public.ad_wallet_ledger (organization_id, created_at desc);
-- A retried sync cannot charge the same spend twice.
create unique index ad_wallet_ledger_one_charge_per_total
  on public.ad_wallet_ledger (campaign_id, meta_spend_total_kobo)
  where kind = 'ad_charge';
-- One free trial credit per customer.
create unique index ad_wallet_ledger_one_trial
  on public.ad_wallet_ledger (organization_id)
  where kind = 'trial';

-- Every sync is logged. In shadow mode, proposed_* record what would have happened
-- and applied stays false, so the numbers can be compared with Ads Manager first.
create table public.ad_spend_snapshots (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  meta_spend_total_kobo bigint not null check (meta_spend_total_kobo >= 0),
  impressions bigint,
  clicks bigint,
  proposed_charge_kobo bigint not null default 0,
  proposed_action text not null default 'none' check (proposed_action in ('none', 'pause', 'raise_limit')),
  applied boolean not null default false,
  created_at timestamptz not null default now()
);
create index ad_spend_snapshots_campaign_idx on public.ad_spend_snapshots (campaign_id, created_at desc);

-- security_invoker keeps RLS in force through the view.
create view public.ad_wallet_balances with (security_invoker = true) as
  select
    organization_id,
    sum(amount_kobo)::bigint as balance_kobo,
    coalesce(sum(amount_kobo) filter (where kind in ('topup', 'trial')), 0)::bigint as credited_kobo,
    coalesce(-sum(amount_kobo) filter (where kind = 'ad_charge'), 0)::bigint as spent_kobo
  from public.ad_wallet_ledger
  group by organization_id;

alter table public.ad_areas enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.ad_campaign_areas enable row level security;
alter table public.ad_wallet_ledger enable row level security;
alter table public.ad_spend_snapshots enable row level security;

revoke all on public.ad_areas, public.ad_campaigns, public.ad_campaign_areas,
  public.ad_wallet_ledger, public.ad_spend_snapshots, public.ad_wallet_balances
  from anon, authenticated;
