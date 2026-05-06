import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  date,
  jsonb,
  numeric,
  boolean,
  uniqueIndex,
  index,
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
  // Billing
  perReviewRate: numeric('per_review_rate', { precision: 10, scale: 2 }),
  billingCycleType: text('billing_cycle_type'),
  // Post-Ashton review (009): cadence + delivery + invoice itemization
  billingCycle: text('billing_cycle').default('quarterly'),
  fiscalYearStartMonth: integer('fiscal_year_start_month').default(1),
  deliveryPreference: text('delivery_preference').default('portal'),
  itemizeInvoice: boolean('itemize_invoice').default(false),
  aautipaySubscriptionId: text('aautipay_subscription_id'),
  aautipaySubscriptionStatus: text('aautipay_subscription_status'),
  // Phase 1.3: cadence + delivery channel
  cadencePeriodType: text('cadence_period_type').notNull().default('quarterly'),
  cadencePeriodMonths: integer('cadence_period_months'),
  deliveryMethod: text('delivery_method').notNull().default('portal'),
  // Phase 7: per-specialty vs flat pricing mode (drives invoice generator)
  pricingMode: text('pricing_mode').notNull().default('flat'),
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

// ─── Peers ───────────────────────────────────────────────────────────────

export const peers = pgTable('peers', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  fullName: text('full_name'),
  email: text('email').unique(),
  // Phase 1.3: specialty + specialties[] dropped in migration 013; use peer_specialties join.
  npi: text('npi'),
  boardCertification: text('board_certification'),
  activeCasesCount: integer('active_cases_count').default(0),
  status: text('status'),
  aiAgreementScore: numeric('ai_agreement_score', { precision: 4, scale: 2 }),
  totalReviewsCompleted: integer('total_reviews_completed').default(0),
  availabilityStatus: text('availability_status').default('available'),
  unavailableFrom: date('unavailable_from'),
  unavailableUntil: date('unavailable_until'),
  unavailableReason: text('unavailable_reason'),
  rateType: text('rate_type').default('per_minute'),
  rateAmount: numeric('rate_amount', { precision: 10, scale: 2 }).default('1.00'),
  // License + KYC + Aautipay
  licenseNumber: text('license_number'),
  licenseState: text('license_state'),
  licenseFileUrl: text('license_file_url'),
  // Post-Ashton review (009): credential expiry + caseload cap + efficiency
  credentialValidUntil: date('credential_valid_until'),
  maxCaseLoad: integer('max_case_load').default(75),
  avgMinutesPerChart: numeric('avg_minutes_per_chart', { precision: 8, scale: 2 }),
  w9Status: text('w9_status').default('not_collected'),
  aautipayBeneficiaryId: text('aautipay_beneficiary_id'),
  aautipayBeneficiaryStatus: text('aautipay_beneficiary_status'),
  aautipayBankAccountId: text('aautipay_bank_account_id'),
  aautipayBankStatus: text('aautipay_bank_status'),
  paymentReady: boolean('payment_ready').default(false),
  // Phase 1.3: lifecycle state machine (replaces ad-hoc status field for transitions)
  state: text('state').notNull().default('pending_credentialing'),
  stateChangedAt: timestamp('state_changed_at', { withTimezone: true }),
  stateChangedBy: text('state_changed_by'),
  stateChangeReason: text('state_change_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

export const peerPayouts = pgTable('peer_payouts', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  peerId: uuid('peer_id').notNull().references(() => peers.id, { onDelete: 'cascade' }),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  unitType: text('unit_type').notNull(),
  units: numeric('units', { precision: 12, scale: 2 }).notNull().default('0'),
  rateAmount: numeric('rate_amount', { precision: 10, scale: 2 }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  aautipayPayoutId: text('aautipay_payout_id'),
  aautipayPayoutStatus: text('aautipay_payout_status'),
  externalPayoutInitiatedAt: timestamp('external_payout_initiated_at', { withTimezone: true }),
  externalPayoutCompletedAt: timestamp('external_payout_completed_at', { withTimezone: true }),
  externalFailReason: text('external_fail_reason'),
});

export const peersRelations = relations(peers, ({ many }) => ({
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
  peerId: uuid('peer_id').references(() => peers.id),
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
  // Post-Ashton review (009): MRN, reassignment, patient name (admin-only), pediatric flag
  mrnNumber: text('mrn_number'),
  reassignmentRequested: boolean('reassignment_requested').default(false),
  reassignmentReason: text('reassignment_reason'),
  reassignmentRequestedAt: timestamp('reassignment_requested_at', { withTimezone: true }),
  patientFirstName: text('patient_first_name'),
  patientLastName: text('patient_last_name'),
  isPediatric: boolean('is_pediatric').default(false),
  clinicId: uuid('clinic_id'),
  // Phase 1.3
  mrnSource: text('mrn_source'),
  cadencePeriodLabel: text('cadence_period_label'),
  assignmentSource: text('assignment_source').default('manual'),
  returnedByPeerAt: timestamp('returned_by_peer_at', { withTimezone: true }),
  returnedReason: text('returned_reason'),
  manualOverrides: text('manual_overrides').array().default(sql`'{}'::text[]`),
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
  peer: one(peers, {
    fields: [reviewCases.peerId],
    references: [peers.id],
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
  // numeric(5,2) so 88.89 round-trips exactly. mode:'number' makes drizzle
  // coerce string ↔ number at the boundary so consumers don't need Number().
  overallScore: numeric('overall_score', { precision: 5, scale: 2, mode: 'number' }),
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
  peerId: uuid('peer_id').references(() => peers.id),
  criteriaScores: jsonb('criteria_scores'),
  deficiencies: jsonb('deficiencies'),
  // numeric(5,2) so 88.89 round-trips exactly. mode:'number' makes drizzle
  // coerce string ↔ number at the boundary so consumers don't need Number().
  overallScore: numeric('overall_score', { precision: 5, scale: 2, mode: 'number' }),
  narrativeFinal: text('narrative_final'),
  aiAgreementPercentage: numeric('ai_agreement_percentage', {
    precision: 5,
    scale: 2,
  }),
  peerChanges: jsonb('reviewer_changes'),
  qualityScore: integer('quality_score'),
  qualityNotes: text('quality_notes'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).default(
    sql`now()`
  ),
  timeSpentMinutes: integer('time_spent_minutes'),
  // Peer license snapshot (HRSA audit) — captured at submission
  peerNameSnapshot: text('reviewer_name_snapshot'),
  peerLicenseSnapshot: text('reviewer_license_snapshot'),
  peerLicenseStateSnapshot: text('reviewer_license_state_snapshot'),
  // Post-Ashton review (009): MRN snapshot + peer signature block
  mrnNumber: text('mrn_number'),
  peerSignatureText: text('reviewer_signature_text'),
  // Phase 1.3
  scoringBreakdown: jsonb('scoring_breakdown'),
  scoringEngineVersion: text('scoring_engine_version'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
});

export const reviewResultsRelations = relations(reviewResults, ({ one }) => ({
  case: one(reviewCases, {
    fields: [reviewResults.caseId],
    references: [reviewCases.id],
  }),
  peer: one(peers, {
    fields: [reviewResults.peerId],
    references: [peers.id],
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
  aautipaySubscriptionInitiatedAt: timestamp('aautipay_subscription_initiated_at', { withTimezone: true }),
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

// ─── Reports ─────────────────────────────────────────────────────────────────

export const reportTemplates = pgTable('report_templates', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  templateKey: text('template_key').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
});

export const savedReports = pgTable('saved_reports', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  templateKey: text('template_key').notNull(),
  reportName: text('report_name').notNull(),
  rangeStart: date('range_start'),
  rangeEnd: date('range_end'),
  filters: jsonb('filters'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
});

export const reportRuns = pgTable('report_runs', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  savedReportId: uuid('saved_report_id').references(() => savedReports.id, { onDelete: 'set null' }),
  templateKey: text('template_key').notNull(),
  companyId: uuid('company_id').references(() => companies.id),
  rangeStart: date('range_start'),
  rangeEnd: date('range_end'),
  filters: jsonb('filters'),
  pdfUrl: text('pdf_url'),
  status: text('status').notNull().default('pending'),
  failReason: text('fail_reason'),
  generatedBy: text('generated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

// ─── Invoices ────────────────────────────────────────────────────────────────

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    invoiceNumber: text('invoice_number').notNull().unique(),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    contractId: uuid('contract_id').references(() => contracts.id),
    rangeStart: date('range_start').notNull(),
    rangeEnd: date('range_end').notNull(),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    reviewCount: integer('review_count').notNull().default(0),
    providerCount: integer('provider_count').notNull().default(0),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').default('USD'),
    status: text('status').notNull().default('draft'),
    description: text('description'),
    lineItems: jsonb('line_items'),
    paymentProvider: text('payment_provider'),
    externalInvoiceId: text('external_invoice_id'),
    externalSubscriptionId: text('external_subscription_id'),
    paymentLinkUrl: text('payment_link_url'),
    paymentMethod: text('payment_method'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    pdfUrl: text('pdf_url'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    viewedAt: timestamp('viewed_at', { withTimezone: true }),
    dueDate: date('due_date'),
    notes: text('notes'),
    // Post-Ashton review (009): override + itemization + adjustment audit
    quantityOverride: integer('quantity_override'),
    itemizedLines: jsonb('itemized_lines'),
    adjustmentReason: text('adjustment_reason'),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
  },
  (t) => ({
    companyStatusIdx: index('invoices_company_status_idx').on(t.companyId, t.status),
  })
);

// ─── Tags ────────────────────────────────────────────────────────────────────

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  // Phase 1.3: dropped UNIQUE on (name) — uniqueness is now scope-conditional
  // (see partial indexes uniq_tag_global / uniq_tag_cadence in migration 014).
  name: text('name').notNull(),
  color: text('color').default('cobalt'),
  description: text('description'),
  usageCount: integer('usage_count').default(0),
  createdBy: text('created_by'),
  // Phase 1.3 — scope/company/period for cadence-scoped tags
  scope: text('scope').notNull().default('global'),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  periodLabel: text('period_label'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
});

export const tagAssociations = pgTable(
  'tag_associations',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  },
  (t) => ({
    entityIdx: index('tag_assoc_entity_idx').on(t.entityType, t.entityId),
    tagIdx: index('tag_assoc_tag_idx').on(t.tagId),
  })
);

// ─── Settings ────────────────────────────────────────────────────────────────

export const globalSettings = pgTable('global_settings', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  settingKey: text('setting_key').notNull().unique(),
  settingValue: jsonb('setting_value').notNull(),
  description: text('description'),
  updatedBy: text('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

export const companySettings = pgTable(
  'company_settings',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    settingKey: text('setting_key').notNull(),
    settingValue: jsonb('setting_value').notNull(),
    updatedBy: text('updated_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
  },
  (t) => ({
    companyKeyIdx: uniqueIndex('company_settings_company_key_idx').on(t.companyId, t.settingKey),
  })
);

// ─── Company Forms ───────────────────────────────────────────────────────────
// Mirrors the live `company_forms` table introduced via the
// migrate-006-company-forms.ts script (predates the SQL migrations directory
// for this table). Columns match the live information_schema definition
// exactly: see `scripts/migrate-006-company-forms.ts` and the live DB.

export const companyForms = pgTable('company_forms', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  specialty: text('specialty').notNull(),
  formName: text('form_name').notNull(),
  formIdentifier: text('form_identifier'),
  formFields: jsonb('form_fields').notNull(),
  isActive: boolean('is_active').default(true),
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }).default(sql`now()`),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  templatePdfUrl: text('template_pdf_url'),
  templatePdfName: text('template_pdf_name'),
  // Post-Ashton review (009): allow peer to invoke AI-drafted narrative on this form
  allowAiGeneratedRecommendations: boolean('allow_ai_generated_recommendations').default(false),
  // Phase 1.3
  scoringSystem: text('scoring_system').notNull().default('yes_no_na'),
  passFailThreshold: jsonb('pass_fail_threshold'),
});

// ─── Clinics (FQHC sub-locations) — 009 ──────────────────────────────────────

export const clinics = pgTable('clinics', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  city: text('city'),
  state: text('state'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
});

// ─── Case Reassignment Requests — 009 ────────────────────────────────────────

export const caseReassignmentRequests = pgTable('case_reassignment_requests', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  caseId: uuid('case_id').notNull().references(() => reviewCases.id, { onDelete: 'cascade' }),
  peerId: uuid('peer_id').references(() => peers.id),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('open'),
  resolvedBy: text('resolved_by'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolutionNote: text('resolution_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
});

// ─── User Roles — 009 ────────────────────────────────────────────────────────

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  userId: text('user_id').notNull().unique(),
  email: text('email'),
  role: text('role').notNull(),  // 'admin' | 'reviewer' | 'client' | 'credentialing'
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

// ─── Aautipay event log ──────────────────────────────────────────────────────

export const aautipayEvents = pgTable(
  'aautipay_events',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    eventType: text('event_type').notNull(),
    externalId: text('external_id').notNull(),
    rawPayload: jsonb('raw_payload').notNull(),
    status: text('status'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    processingError: text('processing_error'),
    receivedAt: timestamp('received_at', { withTimezone: true }).default(sql`now()`),
  },
  (t) => ({
    eventExternalIdx: index('aautipay_events_event_external_idx').on(t.eventType, t.externalId),
  })
);

// ─── Phase 1.3 — peer specialties + state machine + credentialing ────────────

export const specialtyTaxonomy = pgTable('specialty_taxonomy', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  name: text('name').notNull().unique(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export const peerSpecialties = pgTable(
  'peer_specialties',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    peerId: uuid('peer_id').notNull().references(() => peers.id, { onDelete: 'cascade' }),
    specialty: text('specialty').notNull(),
    verifiedStatus: text('verified_status').notNull().default('pending'),
    verifiedBy: text('verified_by'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    peerSpecialtyUniq: uniqueIndex('peer_specialties_peer_specialty_uniq').on(t.peerId, t.specialty),
    peerIdx: index('idx_peer_specialties_peer').on(t.peerId),
    specialtyIdx: index('idx_peer_specialties_specialty').on(t.specialty),
  })
);

export const peerSpecialtiesRelations = relations(peerSpecialties, ({ one }) => ({
  peer: one(peers, {
    fields: [peerSpecialties.peerId],
    references: [peers.id],
  }),
}));

export const peerInviteTokens = pgTable('peer_invite_tokens', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  peerEmail: text('peer_email').notNull(),
  token: text('token').notNull().unique(),
  invitedBy: text('invited_by'),
  invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().default(sql`now()`),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  peerId: uuid('peer_id').references(() => peers.id, { onDelete: 'set null' }),
  submissionData: jsonb('submission_data'),
  submissionStatus: text('submission_status').notNull().default('invited'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export const peerStateAudit = pgTable('peer_state_audit', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  peerId: uuid('peer_id').notNull().references(() => peers.id, { onDelete: 'cascade' }),
  fromState: text('from_state'),
  toState: text('to_state').notNull(),
  changedBy: text('changed_by'),
  changeReason: text('change_reason'),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export const credentialerUsers = pgTable('credentialer_users', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  clerkUserId: text('clerk_user_id').unique(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  perPeerRate: numeric('per_peer_rate', { precision: 10, scale: 2 }).notNull().default('100.00'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export const peerCredentialingLog = pgTable('peer_credentialing_log', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  peerId: uuid('peer_id').notNull().references(() => peers.id, { onDelete: 'cascade' }),
  credentialerId: uuid('credentialer_id').references(() => credentialerUsers.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  validUntilOld: date('valid_until_old'),
  validUntilNew: date('valid_until_new'),
  documentUrl: text('document_url'),
  notes: text('notes'),
  rateAtAction: numeric('rate_at_action', { precision: 10, scale: 2 }),
  performedAt: timestamp('performed_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export const licenseNotificationLog = pgTable(
  'license_notification_log',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    peerId: uuid('peer_id').notNull().references(() => peers.id, { onDelete: 'cascade' }),
    threshold: text('threshold').notNull(),
    licenseExpiryDate: date('license_expiry_date').notNull(),
    sentTo: text('sent_to'),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().default(sql`now()`),
    emailId: text('email_id'),
  },
  (t) => ({
    peerThresholdExpiryUniq: uniqueIndex('license_notif_peer_threshold_expiry_uniq').on(
      t.peerId, t.threshold, t.licenseExpiryDate
    ),
  })
);

export const caseTags = pgTable('case_tags', {
  caseId: uuid('case_id').references(() => reviewCases.id, { onDelete: 'cascade' }).notNull(),
  tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
  taggedBy: text('tagged_by'),
  taggedAt: timestamp('tagged_at', { withTimezone: true }).notNull().default(sql`now()`),
  source: text('source'),
});

export const companySpecialtyRates = pgTable(
  'company_specialty_rates',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    specialty: text('specialty').notNull(),
    rateAmount: numeric('rate_amount', { precision: 10, scale: 2 }).notNull(),
    isDefault: boolean('is_default').default(false),
    effectiveFrom: date('effective_from').notNull().default(sql`CURRENT_DATE`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    companySpecialtyUniq: uniqueIndex('company_specialty_rates_company_specialty_uniq').on(
      t.companyId, t.specialty
    ),
  })
);
