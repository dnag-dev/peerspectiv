import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  caseReassignmentRequests,
  reviewCases,
  peers,
  providers,
  companies,
} from '@/lib/db/schema';
import { ReassignmentsList, type ReassignmentRow } from '@/components/assign/ReassignmentsList';
import { Inbox } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getOpenRequests(): Promise<ReassignmentRow[]> {
  const rows = await db
    .select({
      id: caseReassignmentRequests.id,
      caseId: caseReassignmentRequests.caseId,
      peerId: caseReassignmentRequests.peerId,
      reason: caseReassignmentRequests.reason,
      status: caseReassignmentRequests.status,
      createdAt: caseReassignmentRequests.createdAt,
      specialtyRequired: reviewCases.specialtyRequired,
      peerName: peers.fullName,
      providerFirstName: providers.firstName,
      providerLastName: providers.lastName,
      providerSpecialty: providers.specialty,
      companyName: companies.name,
    })
    .from(caseReassignmentRequests)
    .leftJoin(reviewCases, eq(caseReassignmentRequests.caseId, reviewCases.id))
    .leftJoin(peers, eq(caseReassignmentRequests.peerId, peers.id))
    .leftJoin(providers, eq(reviewCases.providerId, providers.id))
    .leftJoin(companies, eq(reviewCases.companyId, companies.id))
    .where(eq(caseReassignmentRequests.status, 'open'));

  return rows.map((r) => ({
    id: r.id,
    caseId: r.caseId,
    peerId: r.peerId,
    reason: r.reason,
    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
    specialty: r.specialtyRequired ?? r.providerSpecialty ?? null,
    peerName: r.peerName ?? null,
    providerName:
      `${r.providerFirstName ?? ''} ${r.providerLastName ?? ''}`.trim() || null,
    companyName: r.companyName ?? null,
  }));
}

export default async function ReassignmentsPage() {
  const requests = await getOpenRequests();

  return (
    <div className="space-y-5">
      <div>
        <div className="text-eyebrow text-ink-500 mb-1">
          ADMIN · REASSIGNMENT REQUESTS
        </div>
        <h1 className="text-h1 text-ink-900">Reassignment requests</h1>
        <p className="mt-1 text-small text-ink-500">
          Reviewers who&apos;ve asked to be taken off a case. Pick a new reviewer or
          dismiss with a note.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-ink-200 bg-paper-surface py-16 text-center shadow-sm">
          <Inbox className="mb-3 h-10 w-10 text-ink-400" />
          <h3 className="text-h3 text-ink-900">No open reassignment requests</h3>
          <p className="mt-1 max-w-sm text-small text-ink-500">
            When a reviewer asks to be taken off a case, it&apos;ll show up here.
          </p>
        </div>
      ) : (
        <ReassignmentsList rows={requests} />
      )}
    </div>
  );
}
