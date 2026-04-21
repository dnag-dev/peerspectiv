-- Ashton Requests Patch: Reviewer Availability, Projected Completion, Client Feedback

-- ============================================
-- REVIEWER AVAILABILITY
-- ============================================

alter table reviewers add column if not exists
  availability_status text not null default 'available';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reviewers_availability_check') then
    alter table reviewers add constraint reviewers_availability_check
      check (availability_status in ('available','vacation','on_leave','inactive'));
  end if;
end $$;

alter table reviewers add column if not exists unavailable_from date;
alter table reviewers add column if not exists unavailable_until date;
alter table reviewers add column if not exists unavailable_reason text;

-- ============================================
-- PROJECTED COMPLETION
-- ============================================

alter table batches add column if not exists projected_completion timestamptz;

-- ============================================
-- CLIENT FEEDBACK
-- ============================================

create table if not exists client_feedback (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  submitted_by text,
  cycle_period text,
  rating_turnaround integer check (rating_turnaround between 1 and 5),
  rating_report_quality integer check (rating_report_quality between 1 and 5),
  rating_communication integer check (rating_communication between 1 and 5),
  rating_overall integer check (rating_overall between 1 and 5),
  open_feedback text,
  would_recommend boolean,
  submitted_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_feedback_company on client_feedback(company_id);
create index if not exists idx_feedback_submitted on client_feedback(submitted_at desc);
