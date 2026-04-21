-- Phase 3 migration: Prospect pipeline, contracts, BAA, cycles, retention, notifications

-- ============================================
-- EXTEND COMPANIES
-- ============================================

alter table companies drop constraint if exists companies_status_check;
alter table companies add constraint companies_status_check
  check (status in (
    'prospect',
    'contract_sent',
    'contract_signed',
    'active',
    'inactive',
    'archived'
  ));

alter table companies alter column status set default 'prospect';

alter table companies add column if not exists prospect_source text;
alter table companies add column if not exists annual_review_count integer;
alter table companies add column if not exists review_cycle text default 'quarterly';
alter table companies add column if not exists contract_sent_at timestamptz;
alter table companies add column if not exists contract_signed_at timestamptz;
alter table companies add column if not exists baa_signed_at timestamptz;
alter table companies add column if not exists docusign_envelope_id text;
alter table companies add column if not exists docusign_contract_url text;
alter table companies add column if not exists docusign_baa_url text;
alter table companies add column if not exists portal_access_granted_at timestamptz;
alter table companies add column if not exists next_cycle_due date;
alter table companies add column if not exists last_cycle_completed date;
alter table companies add column if not exists onboarding_notes text;
alter table companies add column if not exists client_user_id text;
alter table companies add column if not exists address text;
alter table companies add column if not exists city text;
alter table companies add column if not exists state text;
alter table companies add column if not exists created_by text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_review_cycle_check'
  ) then
    alter table companies add constraint companies_review_cycle_check
      check (review_cycle is null or review_cycle in ('monthly','quarterly','semi-annual','annual'));
  end if;
end $$;

-- ============================================
-- CONTRACTS
-- ============================================

create table if not exists contracts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  contract_type text not null check (contract_type in ('service_agreement','baa','combined')),
  docusign_envelope_id text,
  status text not null default 'draft'
    check (status in ('draft','sent','viewed','signed','declined','voided')),
  contract_pdf_path text,
  sent_to_email text,
  sent_to_name text,
  sent_at timestamptz,
  signed_at timestamptz,
  signed_by_name text,
  signed_by_ip text,
  docusign_raw_webhook jsonb,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- REVIEW CYCLES
-- ============================================

create table if not exists review_cycles (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  cycle_period text not null,
  cycle_start date not null,
  cycle_end date not null,
  status text not null default 'pending'
    check (status in ('pending','in_progress','completed','overdue')),
  total_providers integer default 0,
  completed_reviews integer default 0,
  compliance_score numeric(5,2),
  initiated_by text,
  initiated_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- RETENTION SCHEDULE
-- ============================================

create table if not exists retention_schedule (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null,
  entity_id uuid not null,
  storage_path text,
  delete_after timestamptz not null,
  deleted_at timestamptz,
  deleted_by text default 'cron',
  created_at timestamptz default now()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id text,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- DUPLICATE CASE GUARD (batch_period)
-- ============================================

alter table review_cases add column if not exists batch_period text;

-- ============================================
-- INDEXES
-- ============================================

create index if not exists idx_companies_status on companies(status);
create index if not exists idx_companies_next_cycle on companies(next_cycle_due) where status = 'active';
create index if not exists idx_contracts_company on contracts(company_id);
create index if not exists idx_contracts_envelope on contracts(docusign_envelope_id);
create index if not exists idx_contracts_status on contracts(status);
create index if not exists idx_cycles_company on review_cycles(company_id);
create index if not exists idx_cycles_status on review_cycles(status);
create index if not exists idx_retention_delete_after on retention_schedule(delete_after)
  where deleted_at is null;
create index if not exists idx_notifications_user on notifications(user_id)
  where read_at is null;
create index if not exists idx_cases_provider_period on review_cases(provider_id, batch_period)
  where status != 'archived';
