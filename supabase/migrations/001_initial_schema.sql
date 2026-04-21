-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- CORE ENTITIES
-- ============================================

create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  contact_person text,
  contact_email text,
  contact_phone text,
  status text not null default 'active' check (status in ('active', 'archived')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table providers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  specialty text not null,
  npi text,
  email text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table reviewers (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  email text not null unique,
  specialty text not null,
  board_certification text,
  active_cases_count integer default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  ai_agreement_score numeric(4,2),
  total_reviews_completed integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table batches (
  id uuid primary key default uuid_generate_v4(),
  batch_name text not null,
  company_id uuid references companies(id),
  date_uploaded timestamptz default now(),
  source_file_path text,
  total_cases integer default 0,
  assigned_cases integer default 0,
  completed_cases integer default 0,
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  created_by uuid,
  notes text,
  created_at timestamptz default now()
);

create table review_cases (
  id uuid primary key default uuid_generate_v4(),
  batch_id uuid references batches(id),
  provider_id uuid references providers(id),
  reviewer_id uuid references reviewers(id),
  company_id uuid references companies(id),
  assigned_at timestamptz,
  due_date timestamptz,
  encounter_date date,
  chart_file_path text,
  chart_file_name text,
  chart_pages integer,
  status text not null default 'unassigned'
    check (status in ('unassigned', 'pending_approval', 'assigned', 'in_progress', 'completed', 'past_due')),
  ai_analysis_status text default 'pending'
    check (ai_analysis_status in ('pending', 'processing', 'complete', 'failed')),
  ai_processed_at timestamptz,
  specialty_required text,
  priority text default 'normal' check (priority in ('normal', 'high', 'urgent')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table ai_analyses (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references review_cases(id) on delete cascade unique,
  chart_summary text,
  criteria_scores jsonb,
  deficiencies jsonb,
  overall_score integer check (overall_score between 0 and 100),
  documentation_score integer,
  clinical_appropriateness_score integer,
  care_coordination_score integer,
  narrative_draft text,
  tokens_used integer,
  model_used text,
  processing_time_ms integer,
  chart_text_extracted text,
  created_at timestamptz default now()
);

create table review_results (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references review_cases(id) on delete cascade unique,
  reviewer_id uuid references reviewers(id),
  criteria_scores jsonb,
  deficiencies jsonb,
  overall_score integer check (overall_score between 0 and 100),
  narrative_final text,
  ai_agreement_percentage numeric(5,2),
  reviewer_changes jsonb,
  quality_score integer check (quality_score between 0 and 100),
  quality_notes text,
  submitted_at timestamptz default now(),
  time_spent_minutes integer,
  created_at timestamptz default now()
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  action text not null,
  resource_type text,
  resource_id uuid,
  ip_address text,
  metadata jsonb,
  created_at timestamptz default now()
);

create table nl_command_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  command_text text,
  parsed_intent text,
  response_text text,
  action_taken text,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_review_cases_status on review_cases(status);
create index idx_review_cases_batch_id on review_cases(batch_id);
create index idx_review_cases_reviewer_id on review_cases(reviewer_id);
create index idx_review_cases_due_date on review_cases(due_date);
create index idx_providers_company_id on providers(company_id);
create index idx_providers_specialty on providers(specialty);
create index idx_audit_logs_resource on audit_logs(resource_type, resource_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table companies enable row level security;
alter table providers enable row level security;
alter table reviewers enable row level security;
alter table batches enable row level security;
alter table review_cases enable row level security;
alter table ai_analyses enable row level security;
alter table review_results enable row level security;
alter table audit_logs enable row level security;

create policy "Authenticated users can read" on companies for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read" on providers for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read" on reviewers for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read" on batches for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read" on review_cases for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read" on ai_analyses for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read" on review_results for select using (auth.role() = 'authenticated');

create policy "Service role can write" on companies for all using (auth.role() = 'service_role');
create policy "Service role can write" on providers for all using (auth.role() = 'service_role');
create policy "Service role can write" on reviewers for all using (auth.role() = 'service_role');
create policy "Service role can write" on batches for all using (auth.role() = 'service_role');
create policy "Service role can write" on review_cases for all using (auth.role() = 'service_role');
create policy "Service role can write" on ai_analyses for all using (auth.role() = 'service_role');
create policy "Service role can write" on review_results for all using (auth.role() = 'service_role');

-- ============================================
-- SEED DATA
-- ============================================

insert into companies (id, name, contact_person, contact_email, contact_phone) values
  ('11111111-0000-0000-0000-000000000001', 'Hunter Health', 'Dr. Sarah Mitchell', 'smitchell@hunterhealth.org', '316-555-0191'),
  ('11111111-0000-0000-0000-000000000002', 'Access Health', 'James Torres', 'jtorres@accesshealth.org', '512-555-0144'),
  ('11111111-0000-0000-0000-000000000003', 'Family Bridge Clinic', 'Dr. Angela Park', 'apark@familybridge.org', '214-555-0177'),
  ('11111111-0000-0000-0000-000000000004', 'Mansfield Community Health', 'Robert Chen', 'rchen@mansfieldch.org', '817-555-0133');

insert into providers (company_id, first_name, last_name, specialty) values
  ('11111111-0000-0000-0000-000000000001', 'Marissa', 'Backhaus', 'Family Medicine'),
  ('11111111-0000-0000-0000-000000000001', 'David', 'Okonkwo', 'Internal Medicine'),
  ('11111111-0000-0000-0000-000000000002', 'Paula', 'Clark', 'Pediatrics'),
  ('11111111-0000-0000-0000-000000000002', 'Test', 'Provider', 'Behavioral Health'),
  ('11111111-0000-0000-0000-000000000003', 'Jennifer', 'Walsh', 'OBGYN'),
  ('11111111-0000-0000-0000-000000000003', 'Marcus', 'Hill', 'Family Medicine'),
  ('11111111-0000-0000-0000-000000000004', 'Lisa', 'Nguyen', 'Dental Care'),
  ('11111111-0000-0000-0000-000000000004', 'Carlos', 'Reyes', 'Behavioral Health');

insert into reviewers (full_name, email, specialty, board_certification, active_cases_count) values
  ('Shannon Schrader MD', 'sschrader@peerspectiv.com', 'Family Medicine', 'ABFM', 3),
  ('Mark McGranahan MD', 'mmcgranahan@peerspectiv.com', 'Internal Medicine', 'ABIM', 5),
  ('Dr. Patricia Anand', 'panand@peerspectiv.com', 'Pediatrics', 'ABP', 2),
  ('Dr. Robert Voss', 'rvoss@peerspectiv.com', 'OBGYN', 'ABOG', 1),
  ('Dr. Keisha Monroe', 'kmonroe@peerspectiv.com', 'Behavioral Health', 'ABPN', 4),
  ('Dr. James Whitfield', 'jwhitfield@peerspectiv.com', 'Family Medicine', 'ABFM', 0);

-- Storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medical-charts',
  'medical-charts',
  false,
  52428800,
  array['application/pdf']
) on conflict (id) do nothing;

create policy "Service role only" on storage.objects
  for all using (bucket_id = 'medical-charts' AND auth.role() = 'service_role');
