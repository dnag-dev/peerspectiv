-- Phase 2 migration: Ash conversations + corrective actions
-- Run against Neon Postgres

create extension if not exists "uuid-ossp";

-- ============================================
-- ASH CONVERSATIONS
-- ============================================

create table if not exists ash_conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  portal text not null check (portal in ('admin','client','reviewer')),
  messages jsonb not null default '[]',
  context jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_ash_conv_user on ash_conversations(user_id);
create index if not exists idx_ash_conv_portal on ash_conversations(portal);

-- ============================================
-- CORRECTIVE ACTIONS
-- ============================================

create table if not exists corrective_actions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  provider_id uuid references providers(id),
  title text not null,
  description text,
  identified_issue text,
  assigned_to text,
  status text not null default 'open' check (status in ('open','in_review','closed')),
  due_date timestamptz,
  progress_pct integer default 0 check (progress_pct between 0 and 100),
  source_case_id uuid references review_cases(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_corrective_company on corrective_actions(company_id);
create index if not exists idx_corrective_provider on corrective_actions(provider_id);
create index if not exists idx_corrective_status on corrective_actions(status);

-- ============================================
-- SEED: corrective actions for Horizon Community Health
-- ============================================

-- Note: these will only insert if the referenced company/provider/case exist.
-- Uses DO block so it's safe to re-run.

do $$
declare
  v_company_id uuid;
  v_provider_id uuid;
begin
  select id into v_company_id from companies where name ilike '%Horizon Community Health%' limit 1;

  if v_company_id is not null then
    select id into v_provider_id from providers where company_id = v_company_id and specialty = 'Dental' limit 1;

    insert into corrective_actions (company_id, provider_id, title, description, identified_issue, assigned_to, status, due_date, progress_pct)
    values
      (v_company_id, v_provider_id,
       'Improve Dental Documentation',
       'Dental provider documentation is missing preventive care recommendations in 30% of encounters.',
       'Missing preventive care documentation',
       'Kelli Ramirez',
       'open',
       now() + interval '30 days',
       25),
      (v_company_id, null,
       'Social Determinants Screening Rollout',
       'Implement SDOH screening tool across all specialties. Currently only captured in 40% of visits.',
       'Inconsistent SDOH screening',
       'Quality Committee',
       'in_review',
       now() + interval '60 days',
       60)
    on conflict do nothing;
  end if;
end $$;
