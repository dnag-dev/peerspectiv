import Link from "next/link";
import { db, toSnake } from "@/lib/db";
import { reviewCases, peers as peersTable } from "@/lib/db/schema";
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { AssignmentQueue } from "@/components/assign/AssignmentQueue";
import { AssignTabsNav } from "@/components/assign/AssignTabsNav";
import { AssignedTab, type AssignedRow } from "@/components/assign/AssignedTab";
import { Layers, Inbox } from "lucide-react";
import type { ReviewCase, Peer, Provider, Company } from "@/types";

export const dynamic = 'force-dynamic';

interface PendingCase extends ReviewCase {
  provider: NonNullable<ReviewCase["provider"]>;
  peer: NonNullable<ReviewCase["peer"]>;
  company: NonNullable<ReviewCase["company"]>;
}

async function getPendingCases(): Promise<PendingCase[]> {
  let data;
  try {
    data = await db.query.reviewCases.findMany({
      where: eq(reviewCases.status, "pending_approval"),
      orderBy: asc(reviewCases.createdAt),
      with: {
        provider: { columns: { id: true, firstName: true, lastName: true, specialty: true, npi: true, email: true } },
        peer: { columns: { id: true, fullName: true, email: true, boardCertification: true, activeCasesCount: true, totalReviewsCompleted: true, aiAgreementScore: true, status: true } },
        company: { columns: { id: true, name: true, contactPerson: true, contactEmail: true } },
      },
    });
  } catch (err) {
    console.error("[assign] Failed to fetch pending cases:", err);
    return [];
  }

  return data
    .filter((c) => c.provider && c.peer && c.company)
    .map((c) => toSnake<any>(c)) as PendingCase[];
}

async function getAlternatePeers(
  cases: PendingCase[]
): Promise<Record<string, Peer[]>> {
  const result: Record<string, Peer[]> = {};

  const specialtySet = new Set<string>();
  const currentPeerIds = new Set<string>();
  for (const c of cases) {
    const spec = c.specialty_required || c.provider.specialty;
    if (spec) specialtySet.add(spec);
    currentPeerIds.add(c.peer.id);
  }

  if (specialtySet.size === 0) return result;

  // Phase 1.3: query via peer_specialties join (specialty col dropped from peers)
  const specialtyArr = Array.from(specialtySet);
  const peerRows = await db
    .select({
      peer: peersTable,
      specialties: sql<string[]>`coalesce(array(select specialty from peer_specialties where peer_id = ${peersTable.id} order by specialty), '{}'::text[])`,
    })
    .from(peersTable)
    .where(
      and(
        eq(peersTable.status, "active"),
        sql`exists (select 1 from peer_specialties where peer_id = ${peersTable.id} and specialty = ANY(${specialtyArr}))`
      )
    )
    .orderBy(asc(peersTable.activeCasesCount))
    .limit(50);

  const peers = peerRows.map((r) => {
    const snake = toSnake<any>(r.peer);
    snake.specialties = r.specialties ?? [];
    snake.specialty = (r.specialties && r.specialties[0]) ?? null;
    return snake;
  }) as Peer[];
  for (const c of cases) {
    const neededSpecialty = c.specialty_required || c.provider.specialty;
    result[c.id] = peers.filter(
      (r) =>
        r.id !== c.peer.id &&
        Array.isArray((r as any).specialties) &&
        (r as any).specialties.includes(neededSpecialty)
    );
  }

  return result;
}

async function getApprovedTodayCount(): Promise<number> {
  const startOfDayUtc = new Date();
  startOfDayUtc.setUTCHours(0, 0, 0, 0);
  try {
    const data = await db
      .select({ id: reviewCases.id })
      .from(reviewCases)
      .where(
        and(
          gte(reviewCases.updatedAt, startOfDayUtc),
          inArray(reviewCases.status, ["assigned", "in_progress", "completed", "past_due"])
        )
      );
    return data.length;
  } catch {
    return 0;
  }
}

async function getAssignedRows(): Promise<AssignedRow[]> {
  let data;
  try {
    data = await db.query.reviewCases.findMany({
      where: inArray(reviewCases.status, ["assigned", "in_progress"]),
      orderBy: asc(reviewCases.dueDate),
      columns: {
        id: true,
        status: true,
        dueDate: true,
        specialtyRequired: true,
        batchId: true,
      },
      with: {
        provider: { columns: { id: true, firstName: true, lastName: true, specialty: true } },
        peer: { columns: { id: true, fullName: true } },
        company: { columns: { id: true, name: true } },
        batch: { columns: { id: true, batchName: true } },
      },
    });
  } catch (err) {
    console.error("[assign] Failed to fetch assigned cases:", err);
    return [];
  }

  return data.map((c) => ({
    id: c.id,
    status: c.status as string,
    due_date: c.dueDate ? new Date(c.dueDate).toISOString() : null,
    specialty_required: c.specialtyRequired,
    batch_id: c.batchId,
    batch_name: c.batch?.batchName ?? null,
    provider: c.provider
      ? {
          id: c.provider.id,
          first_name: c.provider.firstName,
          last_name: c.provider.lastName,
          specialty: c.provider.specialty,
        }
      : null,
    peer: c.peer
      ? { id: c.peer.id, full_name: c.peer.fullName }
      : null,
    company: c.company ? { id: c.company.id, name: c.company.name } : null,
  })) as AssignedRow[];
}

export default async function AssignPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const activeTab = sp?.tab === "assigned" ? "assigned" : "pending";

  const [pendingCases, assignedRows] = await Promise.all([
    getPendingCases(),
    getAssignedRows(),
  ]);

  const alternatePeers =
    activeTab === "pending" ? await getAlternatePeers(pendingCases) : {};
  const approvedToday = await getApprovedTodayCount();

  const confidences = pendingCases
    .map((c) => {
      try {
        const parsed = c.notes ? JSON.parse(c.notes) : null;
        return typeof parsed?.confidence === "number" ? parsed.confidence : 85;
      } catch {
        return 85;
      }
    })
    .filter((v): v is number => Number.isFinite(v));
  const avgMatch =
    confidences.length > 0
      ? Math.round(confidences.reduce((s, v) => s + v, 0) / confidences.length)
      : null;

  const monitoringCount = new Set(
    pendingCases.map((c) => c.batch_id).filter(Boolean)
  ).size;

  // Filter dropdown options for the Assigned tab.
  const companyMap = new Map<string, string>();
  const peerMap = new Map<string, string>();
  const specialtySet = new Set<string>();
  for (const r of assignedRows) {
    if (r.company?.id && r.company.name) companyMap.set(r.company.id, r.company.name);
    if (r.peer?.id && r.peer.full_name)
      peerMap.set(r.peer.id, r.peer.full_name);
    const s = r.specialty_required ?? r.provider?.specialty;
    if (s) specialtySet.add(s);
  }
  const companies = Array.from(companyMap, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const peers = Array.from(peerMap, ([id, full_name]) => ({ id, full_name })).sort(
    (a, b) => a.full_name.localeCompare(b.full_name)
  );
  const specialties = Array.from(specialtySet).sort();

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <div className="text-eyebrow text-ink-500 mb-1">
          ADMIN · ASSIGNMENT WORKFLOW
        </div>
        <h1 className="text-h1 text-ink-900">AI assignment queue</h1>
        <p className="mt-1 text-small text-ink-500">
          Review and approve Ash&apos;s peer assignments before they go live.
        </p>
      </div>

      {/* Stat strip */}
      <div className="flex items-center justify-between gap-4 rounded-lg border border-ink-200 bg-paper-surface px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-5">
          <StatBlock label="Pending" value={pendingCases.length.toString()} />
          <span className="w-px h-8 bg-ink-200" />
          <StatBlock label="Assigned" value={assignedRows.length.toString()} />
          <span className="w-px h-8 bg-ink-200" />
          <StatBlock label="Approved today" value={approvedToday.toString()} />
          <span className="w-px h-8 bg-ink-200" />
          <StatBlock
            label="Avg match"
            value={avgMatch != null ? `${avgMatch}%` : "—"}
            valueClassName="text-cobalt-700"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-mint-500 opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-mint-600" />
          </span>
          <span className="text-code text-ink-600">
            Ash is monitoring {monitoringCount} {monitoringCount === 1 ? "batch" : "batches"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <AssignTabsNav
        pendingCount={pendingCases.length}
        assignedCount={assignedRows.length}
      />

      {/* Tab content */}
      {activeTab === "pending" ? (
        pendingCases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="mb-4 h-12 w-12 text-ink-400" />
              <h3 className="text-h3 text-ink-900">No pending assignments</h3>
              <p className="mt-1 max-w-sm text-small text-ink-500">
                All AI-suggested assignments have been reviewed. Check the batches
                page to trigger new assignments.
              </p>
              <Link
                href="/batches"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cobalt-700 hover:underline"
              >
                <Layers className="h-4 w-4" />
                Go to Batches
              </Link>
            </CardContent>
          </Card>
        ) : (
          <AssignmentQueue
            pendingCases={pendingCases}
            alternatePeers={alternatePeers}
          />
        )
      ) : (
        <AssignedTab
          rows={assignedRows}
          companies={companies}
          peers={peers}
          specialties={specialties}
        />
      )}
    </div>
  );
}

function StatBlock({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div>
      <div className="text-eyebrow text-ink-500">{label}</div>
      <div className={`text-h2 font-medium text-ink-900 ${valueClassName ?? ""}`}>
        {value}
      </div>
    </div>
  );
}
