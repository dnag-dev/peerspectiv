/**
 * Phase 3.2 + 3.4 — Canonical report generators.
 *
 * POST /api/reports/generate/{type} where type ∈
 *   per_provider | question_analytics | specialty_highlights |
 *   provider_highlights | quality_certificate | reviewer_scorecard
 *
 * Body shape varies by type but always includes the company/peer scope and
 * (where applicable) cadence_period_label + rangeStart/rangeEnd.
 *
 * Persona enforcement: every route calls assertReportAccess() before any
 * data fetch. Cross-tenant URL manipulation throws 403.
 */

import { NextRequest, NextResponse } from 'next/server';
import { pdfResponseHeaders } from '@/lib/pdf/render';
import { assertReportAccess, type ReportType, type Role } from '@/lib/reports/persona-guard';
import * as perProvider from '@/lib/reports/types/per-provider-review-answers';
import * as questionAnalytics from '@/lib/reports/types/question-analytics';
import * as specialtyHighlights from '@/lib/reports/types/specialty-highlights';
import * as providerHighlights from '@/lib/reports/types/provider-highlights';
import * as qualityCertificate from '@/lib/reports/types/quality-certificate';
import { requireActiveCompany } from '@/lib/utils/company-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const VALID_TYPES = new Set<ReportType>([
  'per_provider',
  'question_analytics',
  'specialty_highlights',
  'provider_highlights',
  'quality_certificate',
  'reviewer_scorecard',
]);

interface ResolvedUser {
  role: Role;
  companyId?: string;
  peerId?: string;
}

/** Resolve current user role + scope. Demo headers preferred for tests. */
async function resolveUser(req: NextRequest): Promise<ResolvedUser> {
  const role = (req.headers.get('x-demo-role') as Role | null) ?? 'admin';
  const companyId = req.headers.get('x-demo-company-id') ?? undefined;
  const peerId = req.headers.get('x-demo-peer-id') ?? undefined;
  return { role, companyId, peerId };
}

export async function POST(req: NextRequest, { params }: { params: { type: string } }) {
  const type = params.type as ReportType;
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json(
      { error: `Unknown report type: ${type}` },
      { status: 400 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const user = await resolveUser(req);
  const companyId = (body.company_id ?? body.companyId) as string | undefined;
  const peerId = (body.peer_id ?? body.peerId) as string | undefined;
  const resultId = (body.result_id ?? body.resultId) as string | undefined;

  // 403 BEFORE any data fetch
  try {
    assertReportAccess(
      user.role,
      type,
      { companyId, peerId, resultId },
      { companyId: user.companyId, peerId: user.peerId }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Forbidden' },
      { status: 403 }
    );
  }

  // Company status guard: only Active companies can generate reports
  if (companyId) {
    const activeCompany = await requireActiveCompany(companyId);
    if (!activeCompany) {
      return NextResponse.json(
        { error: 'Company must be Active to generate reports.', code: 'COMPANY_NOT_ACTIVE' },
        { status: 403 }
      );
    }
  }

  try {
    let buf: Buffer;
    let filename = `${type}-${Date.now()}.pdf`;

    switch (type) {
      case 'per_provider': {
        if (!resultId) throw new Error('result_id required');
        buf = await perProvider.generate({ resultId });
        filename = `per-provider-${resultId}.pdf`;
        break;
      }
      case 'question_analytics': {
        if (!companyId) throw new Error('company_id required');
        buf = await questionAnalytics.generate({
          companyId,
          rangeStart: String(body.range_start ?? body.rangeStart ?? ''),
          rangeEnd: String(body.range_end ?? body.rangeEnd ?? ''),
          specialty: body.specialty as string | undefined,
          cadencePeriodLabel: body.cadence_period_label as string | undefined,
        });
        filename = `question-analytics-${companyId}.pdf`;
        break;
      }
      case 'specialty_highlights': {
        if (!companyId) throw new Error('company_id required');
        buf = await specialtyHighlights.generate({
          companyId,
          rangeStart: String(body.range_start ?? body.rangeStart ?? ''),
          rangeEnd: String(body.range_end ?? body.rangeEnd ?? ''),
          cadencePeriodLabel: body.cadence_period_label as string | undefined,
        });
        filename = `specialty-highlights-${companyId}.pdf`;
        break;
      }
      case 'provider_highlights': {
        if (!companyId) throw new Error('company_id required');
        buf = await providerHighlights.generate({
          companyId,
          rangeStart: String(body.range_start ?? body.rangeStart ?? ''),
          rangeEnd: String(body.range_end ?? body.rangeEnd ?? ''),
          cadencePeriodLabel: body.cadence_period_label as string | undefined,
        });
        filename = `provider-highlights-${companyId}.pdf`;
        break;
      }
      case 'quality_certificate': {
        if (!companyId) throw new Error('company_id required');
        const label = (body.cadence_period_label ?? body.period) as string | undefined;
        if (!label) throw new Error('cadence_period_label required');
        buf = await qualityCertificate.generate({
          companyId,
          cadencePeriodLabel: label,
          rangeStart: body.range_start as string | undefined,
          rangeEnd: body.range_end as string | undefined,
          signedByName: body.signed_by_name as string | undefined,
          signedByTitle: body.signed_by_title as string | undefined,
          scoreThreshold: body.score_threshold as number | undefined,
        });
        filename = `quality-certificate-${companyId}.pdf`;
        break;
      }
      case 'reviewer_scorecard': {
        // Backed by existing PeerScorecard PDF template. Implemented in 3.6.
        const { renderPdfToBuffer } = await import('@/lib/pdf/render');
        const { PeerScorecardPdf } = await import('@/lib/pdf/templates/PeerScorecard');
        const { fetchPeerScorecard } = await import('@/lib/reports/data');
        const rangeStart = String(body.range_start ?? body.rangeStart ?? '');
        const rangeEnd = String(body.range_end ?? body.rangeEnd ?? '');
        if (!rangeStart || !rangeEnd) throw new Error('range_start/range_end required');
        const all = await fetchPeerScorecard(rangeStart, rangeEnd);
        const filtered =
          user.role === 'peer' && user.peerId
            ? all.filter((r) => r.peer_id === user.peerId)
            : peerId
            ? all.filter((r) => r.peer_id === peerId)
            : all;
        buf = await renderPdfToBuffer(
          PeerScorecardPdf({
            data: { rangeStart, rangeEnd, rows: filtered },
          }) as any
        );
        filename = `reviewer-scorecard-${rangeStart}-${rangeEnd}.pdf`;
        break;
      }
      default:
        throw new Error(`Unhandled type: ${type}`);
    }

    return new NextResponse(buf as any, {
      status: 200,
      headers: pdfResponseHeaders(filename),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[api/reports/generate/${type}] failed:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
