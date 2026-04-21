export interface Company {
  id: string;
  name: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: 'active' | 'archived';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Provider {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  specialty: string;
  npi: string | null;
  email: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  company?: Company;
}

export interface Reviewer {
  id: string;
  full_name: string;
  email: string;
  specialty: string;
  board_certification: string | null;
  active_cases_count: number;
  status: 'active' | 'inactive';
  ai_agreement_score: number | null;
  total_reviews_completed: number;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  batch_name: string;
  company_id: string | null;
  date_uploaded: string;
  source_file_path: string | null;
  total_cases: number;
  assigned_cases: number;
  completed_cases: number;
  status: 'pending' | 'in_progress' | 'completed';
  created_by: string | null;
  notes: string | null;
  created_at: string;
  company?: Company;
}

export type CaseStatus = 'unassigned' | 'pending_approval' | 'assigned' | 'in_progress' | 'completed' | 'past_due';
export type AIAnalysisStatus = 'pending' | 'processing' | 'complete' | 'failed';

export interface ReviewCase {
  id: string;
  batch_id: string | null;
  provider_id: string | null;
  reviewer_id: string | null;
  company_id: string | null;
  assigned_at: string | null;
  due_date: string | null;
  encounter_date: string | null;
  chart_file_path: string | null;
  chart_file_name: string | null;
  chart_pages: number | null;
  status: CaseStatus;
  ai_analysis_status: AIAnalysisStatus;
  ai_processed_at: string | null;
  specialty_required: string | null;
  priority: 'normal' | 'high' | 'urgent';
  notes: string | null;
  created_at: string;
  updated_at: string;
  provider?: Provider;
  reviewer?: Reviewer;
  company?: Company;
  batch?: Batch;
  ai_analysis?: AIAnalysis;
  review_result?: ReviewResult;
}

export interface CriterionScore {
  criterion: string;
  score: number;
  score_label: string;
  rationale: string;
  ai_flag: boolean;
  flag_reason: string | null;
}

export interface Deficiency {
  type: 'Documentation' | 'Clinical' | 'Medication' | 'Process';
  severity: 'Minor' | 'Moderate' | 'Major';
  description: string;
  chart_citation: string;
  recommendation: string;
}

export interface AIAnalysis {
  id: string;
  case_id: string;
  chart_summary: string | null;
  criteria_scores: CriterionScore[] | null;
  deficiencies: Deficiency[] | null;
  overall_score: number | null;
  documentation_score: number | null;
  clinical_appropriateness_score: number | null;
  care_coordination_score: number | null;
  narrative_draft: string | null;
  tokens_used: number | null;
  model_used: string | null;
  processing_time_ms: number | null;
  chart_text_extracted: string | null;
  created_at: string;
}

export interface ReviewerChange {
  criterion: string;
  ai_score: number;
  reviewer_score: number;
  reason: string;
}

export interface ReviewResult {
  id: string;
  case_id: string;
  reviewer_id: string | null;
  criteria_scores: CriterionScore[] | null;
  deficiencies: Deficiency[] | null;
  overall_score: number | null;
  narrative_final: string | null;
  ai_agreement_percentage: number | null;
  reviewer_changes: ReviewerChange[] | null;
  quality_score: number | null;
  quality_notes: string | null;
  submitted_at: string;
  time_spent_minutes: number | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface NLCommandHistory {
  id: string;
  user_id: string | null;
  command_text: string | null;
  parsed_intent: string | null;
  response_text: string | null;
  action_taken: string | null;
  created_at: string;
}

export interface AssignmentSuggestion {
  case_id: string;
  reviewer_id: string;
  reviewer_name: string;
  specialty_match: string;
  rationale: string;
  confidence: number;
}

export interface AssignmentResult {
  assignments: AssignmentSuggestion[];
  unassignable: { case_id: string; reason: string }[];
  summary: string;
}

export interface CommandResponse {
  intent: string;
  parameters: Record<string, unknown>;
  plain_english_response: string;
  needs_confirmation: boolean;
  data?: unknown;
}
