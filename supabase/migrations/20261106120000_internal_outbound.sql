-- LeadScoreAI internal outbound: lender companies, their contacts, and a do-not-contact list.
-- NOT APPLIED. Needs Damola's explicit OK before it touches the live database.
-- Additive only: new tables, two functions and three views. No existing table is changed.
-- RLS on with no policies: service role only, like the rest of the app.
-- This app never sends email, SMS or WhatsApp. Sending happens in a separate tool from a CSV export.

-- Lower-case letters and digits only, so "Sun King Ltd." and "sunking ltd" compare the same.
create or replace function public.outbound_norm_name(t text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(lower(coalesce(t, '')), '[^a-z0-9]', '', 'g')
$$;

create table public.outbound_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  name_key text generated always as (public.outbound_norm_name(name)) stored,
  -- Lower case, no scheme, no www. Several companies may have no domain (nulls are distinct).
  domain text unique,
  country text,
  niche text,
  segment text not null default 'africa' check (segment in ('africa', 'us_thin_file')),
  source text,
  notes text,
  -- Written by the research action from the public website.
  first_line text,
  website_summary text,
  researched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index outbound_companies_name_key_idx on public.outbound_companies (name_key);
create index outbound_companies_filters_idx on public.outbound_companies (segment, niche, country);

create table public.outbound_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.outbound_companies(id) on delete cascade,
  full_name text,
  name_key text generated always as (public.outbound_norm_name(full_name)) stored,
  title text,
  -- Lower case. Dedupe key number one.
  email text unique,
  linkedin_url text,
  -- As the source reported it (verified, guessed, risky, invalid...).
  email_status text,
  stage text not null default 'new'
    check (stage in ('new', 'researched', 'contacted', 'replied', 'meeting', 'not_a_fit')),
  -- Per-contact override; when empty the company's first line is used.
  first_line text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index outbound_contacts_company_idx on public.outbound_contacts (company_id, name_key);
create index outbound_contacts_stage_idx on public.outbound_contacts (stage);

-- Do-not-contact list. A row blocks a domain (and every subdomain of it, and every email
-- at it), or a company name (matched on outbound_norm_name, as a substring).
-- Locked rows cannot be removed from the app.
create table public.outbound_dnc (
  id uuid primary key default gen_random_uuid(),
  domain text unique,
  name_key text unique,
  reason text,
  locked boolean not null default false,
  added_by text,
  created_at timestamptz not null default now(),
  check (domain is not null or name_key is not null)
);

-- Sun King (Greenlight Planet) is a private client relationship: never contact.
insert into public.outbound_dnc (domain, name_key, reason, locked, added_by) values
  ('sunking.com', null, 'Private client relationship. Never contact.', true, 'seed'),
  ('greenlightplanet.com', null, 'Private client relationship (Sun King). Never contact.', true, 'seed'),
  (null, 'sunking', 'Private client relationship. Never contact.', true, 'seed'),
  (null, 'greenlightplanet', 'Private client relationship (Sun King). Never contact.', true, 'seed');

create or replace function public.outbound_is_suppressed(p_domain text, p_email text, p_company_name text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.outbound_dnc d
    where (
      d.domain is not null and (
        lower(coalesce(p_domain, '')) = d.domain
        or lower(coalesce(p_domain, '')) like '%.' || d.domain
        or lower(split_part(coalesce(p_email, ''), '@', 2)) = d.domain
        or lower(split_part(coalesce(p_email, ''), '@', 2)) like '%.' || d.domain
      )
    ) or (
      d.name_key is not null and d.name_key <> ''
      and public.outbound_norm_name(p_company_name) like '%' || d.name_key || '%'
    )
  )
$$;

-- One row per contact with its company fields, for the list and filters.
create view public.outbound_contact_rows
with (security_invoker = true) as
select
  c.id,
  c.company_id,
  c.full_name,
  c.title,
  c.email,
  c.linkedin_url,
  c.email_status,
  c.stage,
  c.first_line as contact_first_line,
  coalesce(nullif(c.first_line, ''), co.first_line) as first_line,
  c.source,
  c.created_at,
  c.updated_at,
  co.name as company_name,
  co.domain,
  co.country,
  co.niche,
  co.segment,
  co.researched_at,
  co.website_summary,
  public.outbound_is_suppressed(co.domain, c.email, co.name) as suppressed
from public.outbound_contacts c
join public.outbound_companies co on co.id = c.company_id;

-- The only source the CSV export reads. Suppressed rows, rows with no email, emails a
-- source marked invalid or bounced, and "not a fit" contacts can never appear here.
create view public.outbound_exportable_contacts
with (security_invoker = true) as
select r.*
from public.outbound_contact_rows r
where r.suppressed = false
  and r.email is not null
  and r.stage <> 'not_a_fit'
  and coalesce(r.email_status, '') !~* '(invalid|bounce)';

-- Filter dropdown values with counts.
create view public.outbound_company_facets
with (security_invoker = true) as
select 'niche'::text as kind, niche as value, count(*)::int as n
from public.outbound_companies where niche is not null and niche <> '' group by niche
union all
select 'country'::text, country, count(*)::int
from public.outbound_companies where country is not null and country <> '' group by country;

alter table public.outbound_companies enable row level security;
alter table public.outbound_contacts enable row level security;
alter table public.outbound_dnc enable row level security;

-- Staff routes use the service role. Nothing here is for the public API roles.
revoke all on public.outbound_contact_rows, public.outbound_exportable_contacts, public.outbound_company_facets
  from anon, authenticated;
revoke execute on function public.outbound_is_suppressed(text, text, text) from public, anon, authenticated;
grant execute on function public.outbound_is_suppressed(text, text, text) to service_role;
