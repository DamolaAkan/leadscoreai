-- LeadScoreAI Repayment Score (public lead magnet at /repayment-score).
-- Applied to the live database 2026-11-11 on Damola's explicit OK ("merge it and apply the migration").
-- Additive only: one new table and one view. No existing table is changed.
-- RLS on with no policies: service role only, like the rest of the app.

create table public.repayment_score_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Details step
  name text not null,
  company text not null,
  role text not null check (role in ('ceo', 'credit_head', 'collections', 'finance', 'sales', 'investor', 'other')),
  email text not null,
  whatsapp text,
  finances text not null,
  country text not null,
  book_size text not null check (book_size in ('under_100k', '100k_500k', '500k_1m', '1m_5m', 'over_5m', 'not_sure')),
  book_over_1m boolean not null default false,
  raising_money boolean not null default false,
  consent boolean not null default false,
  consent_at timestamptz,

  -- Score (worked out on the server)
  total_score smallint not null check (total_score between 0 and 100),
  -- {"acquisition": 40, "screening": 63, ...}, each 0..100
  part_scores jsonb not null,
  weakest_part text not null check (weakest_part in ('acquisition', 'screening', 'handover', 'repayment', 'collections', 'tracking', 'prediction')),
  weakest_score smallint not null,
  -- {"a1": "a1c", ...}: question id -> chosen option id
  answers jsonb not null,

  -- Hot = (weakest part low OR raising money OR book over $1M) AND role is CEO/founder/MD or head of credit/risk.
  is_hot boolean not null default false,
  hot_reasons text[] not null default '{}',

  -- Follow-up
  plan_emailed_at timestamptz,
  status text not null default 'new' check (status in ('new', 'contacted', 'diagnostic_booked', 'diagnostic_paid', 'not_a_fit')),
  notes text,

  source_url text,
  referrer text
);

create index repayment_score_leads_created_idx on public.repayment_score_leads (created_at desc);
create index repayment_score_leads_hot_idx on public.repayment_score_leads (is_hot, created_at desc);
create index repayment_score_leads_email_idx on public.repayment_score_leads (lower(email));

alter table public.repayment_score_leads enable row level security;

-- Hot leads first, newest first. Service role only (views inherit table RLS via security_invoker).
create view public.repayment_score_hot_leads
with (security_invoker = true) as
select id, created_at, name, company, role, email, whatsapp, country, finances, book_size,
       raising_money, total_score, weakest_part, weakest_score, hot_reasons, status
from public.repayment_score_leads
where is_hot
order by created_at desc;
