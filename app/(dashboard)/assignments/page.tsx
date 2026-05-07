/**
 * Phase 5.3 — single Assignments index (SA-067E).
 * Server-rendered list of every review_case across all statuses, with
 * query-string filters (status[], peer, company, specialty, dateFrom,
 * dateTo, cadence). Row actions (View, Reassign, Unassign) live in the
 * client `AssignmentsTable`.
 */
import { and, eq, gte, ilike, inArray, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { reviewCases, peers, providers, companies, batches } from '@/lib/db/schema';
import { AssignmentsTable, type AssignmentRow } from '@/components/assign/AssignmentsTable';
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = 'force-dynamic';

interface SearchParams {
  status?: string | string[];
  peer?: string;
  company?: string;
  specialty?: string;
  dateFrom?: string;
  dateTo?: string;
  cadence?: string;
}

function parseStatusList(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : raw.split(',');
  return arr.map((s) => s.trim()).filter(Boolean);
}

function daysSince(d: Date | null | undefined): number | null {
  if (!d) return null;
  const ms = Date.now() - new Date(d).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

async function loadRows(sp: SearchParams): Promise<AssignmentRow[]> {
  const statuses = parseStatusList(sp.status);
  const conditions: any[] = [];
  if (statuses.length > 0) conditions.push(inArray(reviewCases.status, statuses));
  if (sp.peer) conditions.push(ilike(peers.fullName, `%${sp.peer}%`));
  if (sp.company) conditions.push(ilike(companies.name, `%${sp.company}%`));
  if (sp.specialty) conditions.push(ilike(reviewCases.specialtyRequired, `%${sp.specialty}%`));
  if (sp.cadence) conditions.push(ilike(reviewCases.cadencePeriodLabel, `%${sp.cadence}%`));
  if (sp.dateFrom) {
    conditions.push(gte(reviewCases.createdAt, new Date(`${sp.dateFrom}T00:00:00Z`)));
  }
  if (sp.dateTo) {
    conditions.push(lte(reviewCases.createdAt, new Date(`${sp.dateTo}T23:59:59Z`)));
  }

  const rows = await db
    .select({
      id: reviewCases.id,
      status: reviewCases.status,
      specialty: reviewCases.specialtyRequired,
      dueDate: reviewCases.dueDate,
      createdAt: reviewCases.createdAt,
      assignedAt: reviewCases.assignedAt,
      updatedAt: reviewCases.updatedAt,
      returnedReason: reviewCases.returnedReason,
      returnedAt: reviewCases.returnedByPeerAt,
      cadence: reviewCases.cadencePeriodLabel,
      peerId: peers.id,
      peerName: peers.fullName,
      providerFirst: providers.firstName,
      providerLast: providers.lastName,
      companyId: companies.id,
      companyName: companies.name,
      batchName: batches.batchName,
    })
    .from(reviewCases)
    .leftJoin(peers, eq(reviewCases.peerId, peers.id))
    .leftJoin(providers, eq(reviewCases.providerId, providers.id))
    .leftJoin(companies, eq(reviewCases.companyId, companies.id))
    .leftJoin(batches, eq(reviewCases.batchId, batches.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(500);

  return rows.map((r) => {
    // "Days in status" approximated from updatedAt (last status flip) for
    // active flows, falling back to createdAt for unassigned/pending.
    const anchor =
      r.status === 'returned_by_peer' && r.returnedAt
        ? r.returnedAt
        : r.assignedAt ?? r.updatedAt ?? r.createdAt;
    return {
      id: r.id,
      caseRef: r.id.slice(0, 8),
      providerName:
        `${r.providerFirst ?? ''} ${r.providerLast ?? ''}`.trim() || '—',
      specialty: r.specialty ?? null,
      peerId: r.peerId ?? null,
      peerName: r.peerName ?? null,
      status: r.status ?? 'unassigned',
      daysInStatus: daysSince(anchor as Date | null),
      dueDate: r.dueDate ? new Date(r.dueDate).toISOString() : null,
      returnedReason: r.returnedReason ?? null,
      companyName: r.companyName ?? null,
      batchName: r.batchName ?? null,
      cadence: r.cadence ?? null,
    };
  });
}

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  noStore();
  // Default to unassigned + pending_approval when no status filter specified
  const hasStatusFilter = !!searchParams.status;
  const effectiveParams = hasStatusFilter
    ? searchParams
    : { ...searchParams, status: ['unassigned', 'pending_approval'] };
  const rows = await loadRows(effectiveParams);
  const activeStatuses = hasStatusFilter
    ? parseStatusList(searchParams.status)
    : ['unassigned', 'pending_approval'];

  return (
    <div className="space-y-5">
      <div>
        <div className="text-eyebrow text-ink-secondary mb-1">WORKSPACE · REVIEWS</div>
        <h1 className="text-h1 text-ink-primary">Reviews</h1>
        <p className="mt-1 text-small text-ink-secondary">
          All review cases across every status — unassigned, pending
          approval, assigned, in progress, completed, returned by peer.
        </p>
      </div>

      <AssignmentsTable rows={rows} initialFilters={{
        status: activeStatuses,
        peer: searchParams.peer ?? '',
        company: searchParams.company ?? '',
        specialty: searchParams.specialty ?? '',
        dateFrom: searchParams.dateFrom ?? '',
        dateTo: searchParams.dateTo ?? '',
        cadence: searchParams.cadence ?? '',
      }} />
    </div>
  );
}
