import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  date,
  jsonb,
  numeric,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ─── Companies ───────────────────────────────────────────────────────────────

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  status: text('status').default('prospect'),
  notes: text('notes'),
  prospectSource: text('prospect_source'),
  annualReviewCount: integer('annual_review_count'),
  reviewCycle: text('review_cycle'),
  contractSentAt: timestamp('contract_sent_at', { withTimezone: true }),
  contractSignedAt: timestamp('contract_signed_at', { withTimezone: true }),
  baaSignedAt: timestamp('baa_signed_at', { withTimezone: true }),
  docusignEnvelopeId: text('docusign_envelope_id'),
  portalAccessGrantedAt: timestamp('portal_access_granted_at', { withTimezone: true }),
  nextCycleDue: date('next_cycle_due'),
  lastCycleCompleted: date('last_cycle_completed'),
  onboardingNotes: text('onboarding_notes'),
  clientUserId: text('client_user_id'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

export const companiesRelations = relations(companies, ({ many }) => ({
  providers: many(providers),
  batches: many(batches),
  reviewCases: many(reviewCases),
}));

// ─── Providers ───────────────────────────────────────────────────────────────

export const providers = pgTable('providers', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  companyId: uuid('company_id').references(() => companies.id),
  firstName: text('first_name'),
  lastName: text('last_name'),
  specialty: text('specialty'),
  npi: text('npi'),
  email: text('email'),
  status: text('status'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

export const providersRelations = relations(providers, ({ one, many }) => ({
  company: one(companies, {
    fields: [providers.companyId],
    references: [companies.id],
  }),
  reviewCases: many(reviewCases),
}));

// ─── Reviewers ───────────────────────────────────────────────────────────────

export const reviewers = pgTable('reviewers', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  fullName: text('full_name'),
  email: text('email').unique(),
  specialty: text('specialty'),
  boardCertification: text('board_certification'),
  activeCasesCount: integer('active_cases_count').default(0),
  status: text('status'),
  aiAgreementScore: numeric('ai_agreement_score', { precision: 4, scale: 2 }),
  totalReviewsCompleted: integer('total_reviews_completed').default(0),
  availabilityStatus: text('availability_status').default('available'),
  unavailableFrom: date('unavailable_from'),
  unavailableUntil: date('unavailable_until'),
  unavailableReason: text('unavailable_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

export const reviewersRelations = relations(reviewers, ({ many }) => ({
  reviewCases: many(reviewCases),
  reviewResults: many(reviewResults),
}));

// ─── Batches ─────────────────────────────────────────────────────────────────

export const batches = pgTable('batches', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  batchName: text('batch_name'),
  companyId: uuid('company_id').references(() => companies.id),
  dateUploaded: timestamp('date_uploaded', { withTimezone: true }),
  sourceFilePath: text('source_file_path'),
  totalCases: integer('total_cases').default(0),
  assignedCases: integer('assigned_cases').default(0),
  completedCases: integer('completed_cases').default(0),
  status: text('status'),
  createdBy: uuid('created_by'),
  notes: text('notes'),
  projectedCompletion: timestamp('projected_completion', { withTimezone: true }),
  specialty: text('specialty'),
  companyFormId: uuid('company_form_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
});

export const batchesRelations = relations(batches, ({ one, many }) => ({
  company: one(companies, {
    fields: [batches.companyId],
    references: [companies.id],
  }),
  reviewCases: many(reviewCases),
}));

// ─── Review Cases ────────────────────────────────────────────────────────────

export const reviewCases = pgTable('review_cases', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  batchId: uuid('batch_id').references(() => batches.id),
  providerId: uuid('provider_id').references(() => providers.id),
  reviewerId: uuid('reviewer_id').references(() => reviewers.id),
  companyId: uuid('company_id').references(() => companies.id),
  assignedAt: timestamp('assigned_at', { withTimezone: true }),
  dueDate: timestamp('due_date', { withTimezone: true }),
  encounterDate: date('encounter_date'),
  chartFilePath: text('chart_file_path'),
  chartFileName: text('chart_file_name'),
  chartPages: integer('chart_pages'),
  status: text('status').default('unassigned'),
  aiAnalysisStatus: text('ai_analysis_status').default('pending'),
  aiProcessedAt: timestamp('ai_processed_at', { withTimezone: true }),
  specialtyRequired: text('specialty_required'),
  companyFormId: uuid('company_form_id'),
  priority: text('priority').default('normal'),
  notes: text('notes'),
  batchPeriod: text('batch_period'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

export const reviewCasesRelations = relations(reviewCases, ({ one }) => ({
  batch: one(batches, {
    fields: [reviewCases.batchId],
    references: [batches.id],
  }),
  provider: one(providers, {
    fields: [reviewCases.providerId],
    references: [providers.id],
  }),
  reviewer: one(reviewers, {
    fields: [reviewCases.reviewerId],
    references: [reviewers.id],
  }),
  company: one(companies, {
    fields: [reviewCases.companyId],
    references: [companies.id],
  }),
  aiAnalysis: one(aiAnalyses, {
    fields: [reviewCases.id],
    references: [aiAnalyses.caseId],
  }),
  reviewResult: one(reviewResults, {
    fields: [reviewCases.id],
    references: [reviewResults.caseId],
  }),
}));

// ─── AI Analyses ─────────────────────────────────────────────────────────────

export const aiAnalyses = pgTable('ai_analyses', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  caseId: uuid('case_id')
    .references(() => reviewCases.id)
    .unique(),
  chartSummary: text('chart_summary'),
  criteriaScores: jsonb('criteria_scores'),
  deficiencies: jsonb('deficiencies'),
  overallScore: integer('overall_score'),
  documentationScore: integer('documentation_score'),
  clinicalAppropriatenessScore: integer('clinical_appropriateness_score'),
  careCoordinationScore: integer('care_coordination_score'),
  narrativeDraft: text('narrative_draft'),
  tokensUsed: integer('tokens_used'),
  modelUsed: text('model_used'),
  processingTimeMs: integer('processing_time_ms'),
  chartTextExtracted: text('chart_text_extracted'),
  extractionMethod: text('extraction_method'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
});

export const aiAnalysesRelations = relations(aiAnalyses, ({ one }) => ({
  case: one(reviewCases, {
    fields: [aiAnalyses.caseId],
    references: [reviewCases.id],
  }),
}));

// ─── Review Results ──────────────────────────────────────────────────────────

export const reviewResults = pgTable('review_results', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  caseId: uuid('case_id')
    .references(() => reviewCases.id)
    .unique(),
  reviewerId: uuid('reviewer_id').references(() => reviewers.id),
  criteriaScores: jsonb('criteria_scores'),
  deficiencies: jsonb('deficiencies'),
  overallScore: integer('overall_score'),
  narrativeFinal: text('narrative_final'),
  aiAgreementPercentage: numeric('ai_agreement_percentage', {
    precision: 5,
    scale: 2,
  }),
  reviewerChanges: jsonb('reviewer_changes'),
  qualityScore: integer('quality_score'),
  qualityNotes: text('quality_notes'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).default(
    sql`now()`
  ),
  timeSpentMinutes: integer('time_spent_minutes'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
});

export const reviewResultsRelations = relations(reviewResults, ({ one }) => ({
  case: one(reviewCases, {
    fields: [reviewResults.caseId],
    references: [reviewCases.id],
  }),
  reviewer: one(reviewers, {
    fields: [reviewResults.reviewerId],
    references: [reviewers.id],
  }),
}));

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  userId: uuid('user_id'),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: uuid('resource_id'),
  ipAddress: text('ip_address'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
});

// ─── NL Command History ──────────────────────────────────────────────────────

export const nlCommandHistory = pgTable('nl_command_history', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  userId: uuid('user_id'),
  commandText: text('command_text'),
  parsedIntent: text('parsed_intent'),
  responseText: text('response_text'),
  actionTaken: text('action_taken'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
});

// ─── Ash Conversations ───────────────────────────────────────────────────────

export const ashConversations = pgTable('ash_conversations', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  userId: text('user_id').notNull(),
  portal: text('portal').notNull(),
  messages: jsonb('messages').notNull().default([]),
  context: jsonb('context'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

// ─── Corrective Actions ──────────────────────────────────────────────────────

export const correctiveActions = pgTable('corrective_actions', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  companyId: uuid('company_id').references(() => companies.id),
  providerId: uuid('provider_id').references(() => providers.id),
  title: text('title').notNull(),
  description: text('description'),
  identifiedIssue: text('identified_issue'),
  assignedTo: text('assigned_to'),
  status: text('status').default('open'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  progressPct: integer('progress_pct').default(0),
  sourceCaseId: uuid('source_case_id').references(() => reviewCases.id),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

// ─── Phase 3: Contracts, Cycles, Retention, Notifications ──────────────────

export const contracts = pgTable('contracts', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  contractType: text('contract_type').notNull(),  // 'service_agreement' | 'baa' | 'combined'
  docusignEnvelopeId: text('docusign_envelope_id'),
  status: text('status').notNull().default('draft'),
  contractPdfPath: text('contract_pdf_path'),
  sentToEmail: text('sent_to_email'),
  sentToName: text('sent_to_name'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  signedByName: text('signed_by_name'),
  signedByIp: text('signed_by_ip'),
  docusignRawWebhook: jsonb('docusign_raw_webhook'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

export const reviewCycles = pgTable('review_cycles', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  companyId: uuid('company_id').references(() => companies.id),
  cyclePeriod: text('cycle_period').notNull(),
  cycleStart: date('cycle_start').notNull(),
  cycleEnd: date('cycle_end').notNull(),
  status: text('status').notNull().default('pending'),
  totalProviders: integer('total_providers').default(0),
  completedReviews: integer('completed_reviews').default(0),
  complianceScore: numeric('compliance_score', { precision: 5, scale: 2 }),
  initiatedBy: text('initiated_by'),
  initiatedAt: timestamp('initiated_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

export const retentionSchedule = pgTable('retention_schedule', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  entityType: text('entity_type').notNull(),  // 'chart_file' | 'extracted_text' | 'analysis'
  entityId: uuid('entity_id').notNull(),
  storagePath: text('storage_path'),
  deleteAfter: timestamp('delete_after', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: text('deleted_by').default('cron'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  userId: text('user_id'),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body'),
  entityType: text('entity_type'),
  entityId: uuid('entity_id'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
});

// ─── Client Feedback ────────────────────────────────────────────────────────

export const clientFeedback = pgTable('client_feedback', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  companyId: uuid('company_id').references(() => companies.id),
  submittedBy: text('submitted_by'),
  cyclePeriod: text('cycle_period'),
  ratingTurnaround: integer('rating_turnaround'),
  ratingReportQuality: integer('rating_report_quality'),
  ratingCommunication: integer('rating_communication'),
  ratingOverall: integer('rating_overall'),
  openFeedback: text('open_feedback'),
  wouldRecommend: text('would_recommend'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).default(sql`now()`),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
});
