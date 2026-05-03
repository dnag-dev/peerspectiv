/**
 * Report data fetchers — one per PDF template.
 *
 * Reads from existing tables only (review_results, review_cases, providers,
 * companies, reviewers, reviewer_payouts, company_forms). Returns the exact
 * shape each PDF template's interface expects.
 *
 * `criteria_scores` JSONB shape (per types/index.ts):
 *   Array<{ criterion, score (0-4), score_label, rationale, ai_flag, flag_reason }>
 *
 * Older rows may have stored it as an object `{criterion: score}`; the
 * normalize helper accepts both shapes.
 */

import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import type { ProviderHighlightsData } from '@/lib/pdf/templates/ProviderHighlightsPdf';
import type { SpecialtyHighlightsData } from '@/lib/pdf/templates/SpecialtyHighlightsPdf';
import type { QuestionAnalyticsData } from '@/lib/pdf/templates/QuestionAnalyticsPdf';
import type { InvoicePdfData } from '@/lib/pdf/templates/InvoicePdf';
import type { QualityCertificateData } from '@/lib/pdf/templates/QualityCertificatePdf';
import type { PeerEarningsSummaryData } from '@/lib/pdf/templates/PeerEarningsSummaryPdf';

// ─── shared helpers ────────────────────────────────────────────────────────

function rowsOf<T>(result: unknown): T[] {
  return ((result as { rows?: T[] }).rows ?? (result as T[])) as T[];
}

interface CompanyRow {
  id: string;
  name: string;
  contact_person: string | null;
  contact_email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  per_review_rate: string | null;
}

async function getCompany(companyId: string): Promise<CompanyRow | null> {
  const rows = rowsOf<CompanyRow>(
    await db.execute(sql`
      SELECT id, name, contact_person, contact_email, address, city, state, per_review_rate
      FROM companies WHERE id = ${companyId} LIMIT 1
    `)
  );
  return rows[0] ?? null;
}

async function getGlobalSetting(key: string): Promise<unknown> {
  const rows = rowsOf<{ setting_value: unknown }>(
    await db.execute(sql`
      SELECT setting_value FROM global_settings WHERE setting_key = ${key} LIMIT 1
    `)
  );
  return rows[0]?.setting_value ?? null;
}

function unwrapJsonString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return String(v);
}

// ─── Provider Highlights ───────────────────────────────────────────────────

export async function fetchProviderHighlightsData(input: {
  companyId: string;
  rangeStart: string;
  rangeEnd: string;
  filters?: { providerIds?: string[]; specialties?: string[]; tagIds?: string[] };
}): Promise<ProviderHighlightsData> {
  const company = await getCompany(input.companyId);
  if (!company) {
    return {
      companyName: 'Unknown',
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      overallScore: 0,
      providers: [],
    };
  }

  // Pull each completed review with its provider + form name.
  type Row = {
    provider_id: string;
    provider_name: string;
    review_type: string | null;
    overall_score: number | null;
  };
  const rows = rowsOf<Row>(
    await db.execute(sql`
      SELECT
        p.id AS provider_id,
        COALESCE(NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''), 'Unknown provider') AS provider_name,
        COALESCE(cf.form_name, rc.specialty_required, p.specialty, 'General Review') AS review_type,
        rr.overall_score
      FROM review_results rr
      INNER JOIN review_cases rc ON rc.id = rr.case_id
      INNER JOIN providers     p  ON p.id  = rc.provider_id
      LEFT  JOIN company_forms cf ON cf.id = rc.company_form_id
      WHERE rc.company_id = ${input.companyId}
        AND rr.submitted_at::date >= ${input.rangeStart}::date
        AND rr.submitted_at::date <= ${input.rangeEnd}::date
    `)
  );

  // Group by provider, then by review_type.
  const byProvider = new Map<
    string,
    {
      providerName: string;
      scores: number[];
      typeMap: Map<string, { count: number; scores: number[] }>;
    }
  >();
  for (const r of rows) {
    const score = r.overall_score == null ? 0 : Number(r.overall_score);
    const bucket = byProvider.get(r.provider_id) ?? {
      providerName: r.provider_name,
      scores: [] as number[],
      typeMap: new Map<string, { count: number; scores: number[] }>(),
    };
    bucket.scores.push(score);
    const typeKey = r.review_type ?? 'General Review';
    const t = bucket.typeMap.get(typeKey) ?? { count: 0, scores: [] };
    t.count += 1;
    t.scores.push(score);
    bucket.typeMap.set(typeKey, t);
    byProvider.set(r.provider_id, bucket);
  }

  const providers: ProviderHighlightsData['providers'] = [];
  let overallSum = 0;
  let overallCnt = 0;
  const buckets = Array.from(byProvider.values());
  for (const b of buckets) {
    const avg = b.scores.reduce((s: number, v: number) => s + v, 0) / b.scores.length;
    overallSum += b.scores.reduce((s: number, v: number) => s + v, 0);
    overallCnt += b.scores.length;
    const typeEntries = Array.from(b.typeMap.entries()) as Array<[
      string,
      { count: number; scores: number[] },
    ]>;
    providers.push({
      providerName: b.providerName,
      overallScore: avg,
      reviews: typeEntries.map(([reviewType, t]) => ({
        reviewType,
        count: t.count,
        score: t.scores.reduce((s: number, v: number) => s + v, 0) / t.scores.length,
      })),
    });
  }
  providers.sort((a, b) => b.overallScore - a.overallScore);

  // Compute previous 2 quarter scores per provider, based on rangeStart's quarter.
  const startDate = new Date(input.rangeStart + 'T00:00:00Z');
  const startMonth = startDate.getUTCMonth();
  const startYear = startDate.getUTCFullYear();
  const currentQuarter = Math.floor(startMonth / 3); // 0..3
  function prevQuarter(qIdx: number): { label: string; start: string; end: string } {
    // qIdx: 1 => previous, 2 => prev-prev
    let q = currentQuarter - qIdx;
    let y = startYear;
    while (q < 0) {
      q += 4;
      y -= 1;
    }
    const startMonth = q * 3;
    const start = new Date(Date.UTC(y, startMonth, 1));
    const end = new Date(Date.UTC(y, startMonth + 3, 0)); // last day
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return { label: `Q${q + 1} ${y}`, start: fmt(start), end: fmt(end) };
  }
  const prev1 = prevQuarter(1);
  const prev2 = prevQuarter(2);

  type PrevRow = { provider_id: string; quarter_idx: number; avg_score: number | null };
  const prevRows = rowsOf<PrevRow>(
    await db.execute(sql`
      SELECT
        rc.provider_id,
        CASE
          WHEN rr.submitted_at::date BETWEEN ${prev1.start}::date AND ${prev1.end}::date THEN 1
          WHEN rr.submitted_at::date BETWEEN ${prev2.start}::date AND ${prev2.end}::date THEN 2
        END AS quarter_idx,
        AVG(rr.overall_score)::float AS avg_score
      FROM review_results rr
      INNER JOIN review_cases rc ON rc.id = rr.case_id
      WHERE rc.company_id = ${input.companyId}
        AND (
          rr.submitted_at::date BETWEEN ${prev2.start}::date AND ${prev2.end}::date
          OR rr.submitted_at::date BETWEEN ${prev1.start}::date AND ${prev1.end}::date
        )
      GROUP BY rc.provider_id, quarter_idx
    `)
  );
  const prevByProvider = new Map<string, { 1?: number; 2?: number }>();
  for (const r of prevRows) {
    if (!r.quarter_idx) continue;
    const m = prevByProvider.get(r.provider_id) ?? {};
    if (r.quarter_idx === 1) m[1] = r.avg_score == null ? undefined : Number(r.avg_score);
    if (r.quarter_idx === 2) m[2] = r.avg_score == null ? undefined : Number(r.avg_score);
    prevByProvider.set(r.provider_id, m);
  }

  // Map provider name back to id for previous-quarter lookup.
  const nameToId = new Map<string, string>();
  byProvider.forEach((b, pid) => nameToId.set(b.providerName, pid));
  for (const p of providers) {
    const pid = nameToId.get(p.providerName);
    const m = pid ? prevByProvider.get(pid) : undefined;
    p.previousQuarters = [
      { label: prev2.label, score: m && m[2] != null ? (m[2] as number) : null },
      { label: prev1.label, score: m && m[1] != null ? (m[1] as number) : null },
    ];
  }

  return {
    companyName: company.name,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    generatedAt: new Date().toISOString().slice(0, 10),
    overallScore: overallCnt > 0 ? overallSum / overallCnt : 0,
    providers,
  };
}

// ─── Specialty Highlights ──────────────────────────────────────────────────

export async function fetchSpecialtyHighlightsData(input: {
  companyId: string;
  rangeStart: string;
  rangeEnd: string;
}): Promise<SpecialtyHighlightsData> {
  const company = await getCompany(input.companyId);
  if (!company) {
    return {
      companyName: 'Unknown',
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      overallScore: 0,
      specialties: [],
    };
  }
  type Row = {
    specialty: string;
    avg_score: number | null;
    review_count: number;
    provider_count: number;
  };
  const rows = rowsOf<Row>(
    await db.execute(sql`
      SELECT
        COALESCE(NULLIF(p.specialty, ''), 'Unspecified') AS specialty,
        AVG(rr.overall_score)::float AS avg_score,
        COUNT(rr.id)::int AS review_count,
        COUNT(DISTINCT p.id)::int AS provider_count
      FROM review_results rr
      INNER JOIN review_cases rc ON rc.id = rr.case_id
      INNER JOIN providers     p  ON p.id  = rc.provider_id
      WHERE rc.company_id = ${input.companyId}
        AND rr.submitted_at::date >= ${input.rangeStart}::date
        AND rr.submitted_at::date <= ${input.rangeEnd}::date
      GROUP BY COALESCE(NULLIF(p.specialty, ''), 'Unspecified')
      ORDER BY avg_score DESC NULLS LAST
    `)
  );

  const specialties = rows.map((r) => ({
    specialty: r.specialty,
    avgScore: r.avg_score == null ? 0 : Number(r.avg_score),
    reviewCount: r.review_count,
    providerCount: r.provider_count,
  }));

  const overall =
    specialties.length > 0
      ? specialties.reduce((s, x) => s + x.avgScore * x.reviewCount, 0) /
        Math.max(
          1,
          specialties.reduce((s, x) => s + x.reviewCount, 0)
        )
      : 0;

  return {
    companyName: company.name,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    overallScore: overall,
    specialties,
  };
}

// ─── Question Analytics ────────────────────────────────────────────────────

export async function fetchQuestionAnalyticsData(input: {
  companyId: string;
  rangeStart: string;
  rangeEnd: string;
  specialty?: string;
}): Promise<QuestionAnalyticsData> {
  const company = await getCompany(input.companyId);
  if (!company) {
    return {
      companyName: 'Unknown',
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      specialty: input.specialty,
      totalReviews: 0,
      questions: [],
    };
  }

  type Row = {
    criteria_scores: unknown;
    provider_name: string;
    specialty: string | null;
  };
  const rows = rowsOf<Row>(
    await db.execute(sql`
      SELECT
        rr.criteria_scores,
        COALESCE(NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''), 'Unknown provider') AS provider_name,
        p.specialty
      FROM review_results rr
      INNER JOIN review_cases rc ON rc.id = rr.case_id
      INNER JOIN providers     p  ON p.id  = rc.provider_id
      WHERE rc.company_id = ${input.companyId}
        AND rr.submitted_at::date >= ${input.rangeStart}::date
        AND rr.submitted_at::date <= ${input.rangeEnd}::date
        ${input.specialty ? sql`AND p.specialty = ${input.specialty}` : sql``}
    `)
  );

  // Aggregate by criterion text.
  type Tally = {
    yes: number;
    no: number;
    na: number;
    noRespondents: Set<string>;
  };
  const byQuestion = new Map<string, Tally>();

  const normalize = (cs: unknown): Array<{ criterion: string; score: number }> => {
    if (Array.isArray(cs)) {
      return cs
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map((x) => ({
          criterion: String(x.criterion ?? ''),
          score: Number((x as { score?: unknown }).score ?? 0),
        }))
        .filter((x) => x.criterion);
    }
    if (cs && typeof cs === 'object') {
      return Object.entries(cs as Record<string, unknown>).map(([criterion, raw]) => {
        const score =
          raw && typeof raw === 'object' && raw !== null
            ? Number((raw as { score?: unknown }).score ?? 0)
            : Number(raw ?? 0);
        return { criterion, score };
      });
    }
    return [];
  };

  for (const r of rows) {
    const items = normalize(r.criteria_scores);
    for (const it of items) {
      const t = byQuestion.get(it.criterion) ?? {
        yes: 0,
        no: 0,
        na: 0,
        noRespondents: new Set<string>(),
      };
      // Score scale 0-4: 4=yes, 0=no, in-between treated as partial-yes;
      // < 1 counts as "no" with provider attribution; > 0 and < 4 partial.
      if (it.score >= 4) t.yes += 1;
      else if (it.score <= 0) {
        t.no += 1;
        t.noRespondents.add(r.provider_name);
      } else if (Number.isNaN(it.score)) t.na += 1;
      else t.yes += 1;
      byQuestion.set(it.criterion, t);
    }
  }

  // Build (field_key → field_label) lookup from this company's forms so we
  // render human-readable questions instead of raw criterion keys.
  const formRows = rowsOf<{ form_fields: unknown }>(
    await db.execute(sql`
      SELECT form_fields FROM company_forms
      WHERE company_id = ${input.companyId} AND is_active = true
    `)
  );
  const labelMap = new Map<string, string>();
  for (const fr of formRows) {
    const fields = Array.isArray(fr.form_fields) ? fr.form_fields : [];
    for (const f of fields as any[]) {
      const key = f?.field_key;
      const label = f?.field_label;
      if (key && label && !labelMap.has(key)) {
        labelMap.set(String(key), String(label));
      }
    }
  }

  // Fallback humanizer for keys that don't match any active form field
  // (e.g. legacy / migrated seed data using ad-hoc keys).
  const humanize = (k: string) =>
    k
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const questions = Array.from(byQuestion.entries()).map(([questionText, t]) => {
    const total = t.yes + t.no + t.na;
    const compliancePct = total > 0 ? (t.yes / total) * 100 : 0;
    return {
      questionText:
        labelMap.get(questionText) ??
        (questionText.includes(' ') ? questionText : humanize(questionText)),
      yes: t.yes,
      no: t.no,
      na: t.na,
      compliancePct,
      noRespondents: Array.from(t.noRespondents),
    };
  });

  // Sort by % "no" descending (worst first); secondary by total responses desc.
  questions.sort((a, b) => {
    const totalA = a.yes + a.no + a.na;
    const totalB = b.yes + b.no + b.na;
    const noPctA = totalA > 0 ? a.no / totalA : 0;
    const noPctB = totalB > 0 ? b.no / totalB : 0;
    if (noPctB !== noPctA) return noPctB - noPctA;
    return totalB - totalA;
  });

  return {
    companyName: company.name,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    specialty: input.specialty,
    totalReviews: rows.length,
    questions,
  };
}

// ─── Invoice (read existing invoices.id row, NOT a generator) ──────────────

export async function fetchInvoicePdfDataFromInvoice(
  invoiceId: string
): Promise<InvoicePdfData | null> {
  type InvoiceRow = {
    invoice_number: string;
    company_id: string;
    range_start: string;
    range_end: string;
    unit_price: string;
    review_count: number;
    provider_count: number;
    subtotal: string;
    tax_amount: string;
    total_amount: string;
    currency: string;
    line_items: unknown;
    payment_link_url: string | null;
    notes: string | null;
    due_date: string | null;
    created_at: string;
    quantity_override: number | null;
    adjustment_reason: string | null;
    itemized_lines: unknown;
  };
  const rows = rowsOf<InvoiceRow>(
    await db.execute(sql`
      SELECT invoice_number, company_id, range_start, range_end, unit_price,
             review_count, provider_count, subtotal, tax_amount, total_amount,
             currency, line_items, payment_link_url, notes, due_date, created_at,
             quantity_override, adjustment_reason, itemized_lines
      FROM invoices WHERE id = ${invoiceId} LIMIT 1
    `)
  );
  const inv = rows[0];
  if (!inv) return null;
  const company = await getCompany(inv.company_id);

  const issuerName = unwrapJsonString(await getGlobalSetting('peerspectiv_company_name')) || 'Peerspectiv LLC';
  const issuerAddr = unwrapJsonString(await getGlobalSetting('peerspectiv_address')) || '';
  const issuerEmail = unwrapJsonString(await getGlobalSetting('peerspectiv_email')) || '';

  const li = Array.isArray(inv.line_items)
    ? (inv.line_items as Array<{ description: string; quantity: number; unitPrice: number; lineTotal: number }>)
    : [];

  const billAddress = company
    ? [company.address, company.city, company.state].filter(Boolean).join(', ') || null
    : null;

  return {
    invoiceNumber: inv.invoice_number,
    issueDate: new Date(inv.created_at).toISOString().slice(0, 10),
    dueDate: inv.due_date,
    rangeStart: inv.range_start,
    rangeEnd: inv.range_end,
    issuer: { companyName: issuerName, address: issuerAddr, email: issuerEmail },
    billTo: {
      companyName: company?.name ?? 'Unknown',
      contactPerson: company?.contact_person ?? null,
      contactEmail: company?.contact_email ?? null,
      address: billAddress,
    },
    reviewCount: inv.review_count,
    providerCount: inv.provider_count,
    unitPrice: Number(inv.unit_price),
    lineItems: li,
    subtotal: Number(inv.subtotal),
    taxAmount: Number(inv.tax_amount),
    totalAmount: Number(inv.total_amount),
    currency: inv.currency,
    paymentLinkUrl: inv.payment_link_url,
    notes: inv.notes,
    quantityOverride: inv.quantity_override,
    adjustmentReason: inv.adjustment_reason,
    itemizedLines: Array.isArray(inv.itemized_lines)
      ? (inv.itemized_lines as Array<{
          provider_name: string;
          count: number;
          rate: number;
          total: number;
        }>)
      : null,
  };
}

// ─── Quality Certificate ───────────────────────────────────────────────────

export async function fetchQualityCertificateData(input: {
  companyId: string;
  period: string;
  periodStart?: string;
  periodEnd?: string;
  scoreThreshold?: number;
  signedByName?: string;
  signedByTitle?: string;
}): Promise<QualityCertificateData> {
  const company = await getCompany(input.companyId);

  let providers: Array<{ name: string; score: number }> | undefined;
  if (input.periodStart && input.periodEnd) {
    const threshold = input.scoreThreshold ?? 70;
    type Row = { provider_name: string; avg_score: number | null };
    const rows = rowsOf<Row>(
      await db.execute(sql`
        SELECT
          COALESCE(NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''), 'Unknown provider') AS provider_name,
          AVG(rr.overall_score)::float AS avg_score
        FROM review_results rr
        INNER JOIN review_cases rc ON rc.id = rr.case_id
        INNER JOIN providers     p  ON p.id  = rc.provider_id
        WHERE rc.company_id = ${input.companyId}
          AND rr.submitted_at::date >= ${input.periodStart}::date
          AND rr.submitted_at::date <= ${input.periodEnd}::date
        GROUP BY p.id, p.first_name, p.last_name
        HAVING AVG(rr.overall_score) >= ${threshold}
        ORDER BY avg_score DESC NULLS LAST
      `)
    );
    providers = rows.map((r) => ({
      name: r.provider_name,
      score: r.avg_score == null ? 0 : Number(r.avg_score),
    }));
  }

  return {
    organizationName: company?.name ?? 'Unknown Organization',
    period: input.period,
    hrsaRegistration: undefined, // future: pull from company_settings
    signedByName: input.signedByName ?? 'Quality Director',
    signedByTitle: input.signedByTitle ?? 'Independent Peer Review Network',
    signedDate: new Date().toISOString().slice(0, 10),
    providers,
    scoreThreshold: input.scoreThreshold,
  };
}

// ─── Peer Earnings Summary ────────────────────────────────────────────────

export async function fetchPeerEarningsSummaryData(input: {
  peerId: string;
  rangeStart: string;
  rangeEnd: string;
}): Promise<PeerEarningsSummaryData> {
  type ReviewerRow = {
    full_name: string | null;
    email: string | null;
    rate_amount: string | null;
  };
  const peerRows = rowsOf<ReviewerRow>(
    await db.execute(sql`
      SELECT full_name, email, rate_amount
      FROM reviewers WHERE id = ${input.peerId} LIMIT 1
    `)
  );
  const peer = peerRows[0];
  const peerName = peer?.full_name ?? 'Unknown reviewer';
  const peerEmail = peer?.email ?? undefined;
  const fallbackRate = peer?.rate_amount ? Number(peer.rate_amount) : 1.0;

  type LineRow = {
    submitted_at: string;
    case_id: string;
    provider_name: string;
    time_spent_minutes: number | null;
  };
  const lineRows = rowsOf<LineRow>(
    await db.execute(sql`
      SELECT
        rr.submitted_at,
        rc.id AS case_id,
        COALESCE(NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''), 'Unknown provider') AS provider_name,
        rr.time_spent_minutes
      FROM review_results rr
      INNER JOIN review_cases rc ON rc.id = rr.case_id
      INNER JOIN providers     p  ON p.id  = rc.provider_id
      WHERE rr.reviewer_id = ${input.peerId}
        AND rr.submitted_at::date >= ${input.rangeStart}::date
        AND rr.submitted_at::date <= ${input.rangeEnd}::date
      ORDER BY rr.submitted_at ASC
    `)
  );

  const lines = lineRows.map((r) => {
    const minutes = r.time_spent_minutes ?? 0;
    const amount = minutes * fallbackRate;
    return {
      date: new Date(r.submitted_at).toISOString().slice(0, 10),
      caseId: r.case_id,
      providerReviewed: r.provider_name,
      timeSpentMinutes: minutes,
      rate: fallbackRate,
      amount,
    };
  });
  const totalAmount = lines.reduce((s, l) => s + l.amount, 0);

  // YTD calendar-year total (for 1099 note).
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const ytdRows = rowsOf<{ ytd: number | null }>(
    await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0)::float AS ytd
      FROM reviewer_payouts
      WHERE reviewer_id = ${input.peerId}
        AND period_start >= ${yearStart}::date
    `)
  );
  const ytdTotal = Number(ytdRows[0]?.ytd ?? 0);

  return {
    peerName,
    peerEmail,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    currency: 'USD',
    lines,
    totalAmount,
    ytdTotal,
  };
}

// ─── Reviewer Scorecard ───────────────────────────────────────────────────

export interface ReviewerScorecardRow {
  peer_id: string;
  full_name: string;
  cases_reviewed: number;
  avg_turnaround_days: number | null;
  ai_agreement_pct: number | null;
  quality_score: number | null;
  avg_minutes_per_chart: number | null;
  earnings: number;
}

export async function fetchPeerScorecard(
  periodStart: string,
  periodEnd: string
): Promise<ReviewerScorecardRow[]> {
  type Row = {
    peer_id: string;
    full_name: string;
    avg_minutes_per_chart: string | null;
    cases_reviewed: number;
    avg_turnaround_days: number | null;
    ai_agreement_pct: number | null;
    quality_score: number | null;
    earnings: string | null;
  };

  const result = await db.execute<Row>(sql`
    SELECT
      r.id AS reviewer_id,
      r.full_name,
      r.avg_minutes_per_chart,
      COALESCE(rev.cases_reviewed, 0)::int AS cases_reviewed,
      rev.avg_turnaround_days,
      rev.ai_agreement_pct,
      rev.quality_score,
      COALESCE(po.earnings, '0')::text AS earnings
    FROM reviewers r
    LEFT JOIN (
      SELECT
        rc.reviewer_id,
        COUNT(rr.id)::int AS cases_reviewed,
        AVG(EXTRACT(EPOCH FROM (rr.submitted_at - rc.assigned_at)) / 86400.0)::float AS avg_turnaround_days,
        AVG(rr.ai_agreement_percentage)::float AS ai_agreement_pct,
        AVG(rr.quality_score)::float AS quality_score
      FROM review_results rr
      INNER JOIN review_cases rc ON rc.id = rr.case_id
      WHERE rr.submitted_at::date BETWEEN ${periodStart}::date AND ${periodEnd}::date
      GROUP BY rc.reviewer_id
    ) rev ON rev.reviewer_id = r.id
    LEFT JOIN (
      SELECT reviewer_id, SUM(amount) AS earnings
      FROM reviewer_payouts
      WHERE period_start >= ${periodStart}::date
        AND period_end <= ${periodEnd}::date
      GROUP BY reviewer_id
    ) po ON po.reviewer_id = r.id
    ORDER BY r.full_name ASC
  `);

  const rawRows = ((result as { rows?: Row[] }).rows ?? (result as unknown as Row[])) as Row[];
  return rawRows.map((r) => ({
    peer_id: r.peer_id,
    full_name: r.full_name,
    cases_reviewed: Number(r.cases_reviewed ?? 0),
    avg_turnaround_days:
      r.avg_turnaround_days == null
        ? null
        : Math.round(Number(r.avg_turnaround_days) * 10) / 10,
    ai_agreement_pct:
      r.ai_agreement_pct == null ? null : Math.round(Number(r.ai_agreement_pct) * 10) / 10,
    quality_score:
      r.quality_score == null ? null : Math.round(Number(r.quality_score) * 10) / 10,
    avg_minutes_per_chart:
      r.avg_minutes_per_chart == null ? null : Number(r.avg_minutes_per_chart),
    earnings: Number(r.earnings ?? 0),
  }));
}
