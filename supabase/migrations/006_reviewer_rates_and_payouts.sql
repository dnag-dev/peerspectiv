-- Reviewer Rates + Payouts

-- ============================================
-- REVIEWER RATE (per_minute default, flexible per reviewer)
-- ============================================

alter table reviewers add column if not exists
  rate_type text not null default 'per_minute';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reviewers_rate_type_check') then
    alter table reviewers add constraint reviewers_rate_type_check
      check (rate_type in ('per_minute','per_report','per_hour'));
  end if;
end $$;

alter table reviewers add column if not exists
  rate_amount numeric(10,2) not null default 1.00;

-- ============================================
-- REVIEWER PAYOUTS
-- ============================================

create table if not exists reviewer_payouts (
  id uuid primary key default uuid_generate_v4(),
  reviewer_id uuid not null references reviewers(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  unit_type text not null check (unit_type in ('per_minute','per_report','per_hour')),
  units numeric(12,2) not null default 0,
  rate_amount numeric(10,2) not null,
  amount numeric(12,2) not null,
  status text not null default 'pending' check (status in ('pending','approved','paid')),
  notes text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz
);

create index if not exists reviewer_payouts_reviewer_idx on reviewer_payouts(reviewer_id);
create index if not exists reviewer_payouts_status_idx on reviewer_payouts(status);
