import Link from "next/link";
import { notFound } from "next/navigation";
import { db, toSnake } from "@/lib/db";
import { peers, peerSpecialties, reviewCases, reviewResults } from "@/lib/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CaseStatusBadge } from "@/components/batches/CaseStatusBadge";
import { PeerOnboardCard } from "./PeerOnboardCard";
import { PeerStateActions } from "./PeerStateActions";
import { PeerStateHistory } from "./PeerStateHistory";
import { PeerCredentialingLog } from "./PeerCredentialingLog";
import {
  ArrowLeft,
  Mail,
  Stethoscope,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  CalendarX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

// Flat estimate until a payments/rates table exists.
const ESTIMATED_RATE_PER_CASE = 75;

const AVAILABILITY_STYLES: Record<string, string> = {
  available: "bg-mint-100 text-status-info-fg",
  vacation: "bg-critical-100 text-status-danger-fg",
  on_leave: "bg-amber-100 text-status-warning-fg",
  inactive: "bg-ink-100 text-ink-800",
};

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name: string | null | undefined) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

async function getPeerDetail(id: string) {
  const [peerRow] = await db
    .select()
    .from(peers)
    .where(eq(peers.id, id))
    .limit(1);
  if (!peerRow) return null;

  const casesRaw = await db.query.reviewCases.findMany({
    where: eq(reviewCases.peerId, id),
    orderBy: asc(reviewCases.dueDate),
    columns: {
      id: true,
      status: true,
      dueDate: true,
      assignedAt: true,
      specialtyRequired: true,
      batchId: true,
    },
    with: {
      provider: { columns: { firstName: true, lastName: true } },
      company: { columns: { name: true } },
      batch: { columns: { batchName: true } },
    },
  });

  const resultsRaw = await db.query.reviewResults.findMany({
    where: eq(reviewResults.peerId, id),
    orderBy: desc(reviewResults.submittedAt),
    columns: {
      id: true,
      caseId: true,
      overallScore: true,
      submittedAt: true,
      timeSpentMinutes: true,
      narrativeFinal: true,
    },
    with: {
      case: {
        columns: { id: true, batchId: true },
        with: {
          provider: { columns: { firstName: true, lastName: true } },
          company: { columns: { name: true } },
        },
      },
    },
  });

  // Snake-case the responses to preserve the legacy template shape.
  const cases = casesRaw.map((c) => toSnake(c)) as any[];
  const results = resultsRaw.map((r) => {
    const snake = toSnake<any>(r);
    // Legacy code looked under r.review_cases (plural) — preserve that key.
    if (snake.case) snake.review_cases = snake.case;
    return snake;
  });
  // Phase 1.3: hydrate specialties from peer_specialties join
  const specRows = await db
    .select({ specialty: peerSpecialties.specialty })
    .from(peerSpecialties)
    .where(eq(peerSpecialties.peerId, id));
  const specs = specRows.map((s) => s.specialty);
  const peer = toSnake<any>(peerRow);
  peer.specialties = specs;
  peer.specialty = specs[0] ?? null;

  return { peer, cases, results };
}

export default async function PeerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();
  const data = await getPeerDetail(params.id);
  if (!data) notFound();
  const { peer, cases, results } = data;

  const activeCases = cases.filter(
    (c: any) => c.status === "assigned" || c.status === "in_progress"
  );
  const completedCount = results.length;
  const totalMinutes = results
    .map((r: any) => r.time_spent_minutes ?? 0)
    .reduce((a: number, b: number) => a + b, 0);
  const avgMinutes = completedCount ? Math.round(totalMinutes / completedCount) : 0;
  const avgHours = avgMinutes ? (avgMinutes / 60).toFixed(1) : "0";
  const earningsEstimate = completedCount * ESTIMATED_RATE_PER_CASE;

  const availability = peer.availability_status || "available";
  const availClass = AVAILABILITY_STYLES[availability] || AVAILABILITY_STYLES.inactive;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/peers" className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Peers
        </Link>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="flex items-start justify-between gap-6 pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-surface-sidebar text-lg font-medium text-white">
              {initials(peer.full_name)}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-medium tracking-tight">
                {peer.full_name || "Unnamed Peer"}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {peer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {peer.email}
                  </span>
                )}
                {peer.specialty && (
                  <span className="flex items-center gap-1">
                    <Stethoscope className="h-3.5 w-3.5" />
                    {peer.specialty}
                  </span>
                )}
                {peer.board_certification && (
                  <span>Board: {peer.board_certification}</span>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <PeerStateActions
                  peerId={peer.id}
                  currentState={peer.state ?? "active"}
                  peerName={peer.full_name ?? "Peer"}
                />
                <Badge className={cn("border-0", availClass)}>
                  {availability.replace("_", " ")}
                </Badge>
                {availability !== "available" && peer.unavailable_until && (
                  <span className="text-xs text-muted-foreground">
                    Returns {formatDate(peer.unavailable_until)}
                    {peer.unavailable_reason && ` · ${peer.unavailable_reason}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <ClipboardCheck className="h-5 w-5 text-status-info-dot" />
            <div>
              <p className="text-xs text-muted-foreground">Active cases</p>
              <p className="text-xl font-medium">{activeCases.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="h-5 w-5 text-status-info-dot" />
            <div>
              <p className="text-xs text-muted-foreground">Completed reviews</p>
              <p className="text-xl font-medium">{completedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="h-5 w-5 text-status-warning-dot" />
            <div>
              <p className="text-xs text-muted-foreground">Avg time / review</p>
              <p className="text-xl font-medium">
                {avgMinutes ? `${avgHours}h` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <DollarSign className="h-5 w-5 text-status-info-dot" />
            <div>
              <p className="text-xs text-muted-foreground">
                Earnings <span className="italic">(est.)</span>
              </p>
              <p className="text-xl font-medium">
                ${earningsEstimate.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-5 w-5" />
            Active queue
            <Badge variant="secondary" className="ml-2">
              {activeCases.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeCases.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No active cases assigned.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeCases.map((c: any) => {
                  const provider = c.provider || c.providers;
                  const company = c.company || c.companies;
                  const batch = c.batch || c.batches;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {provider
                          ? `${provider.first_name} ${provider.last_name}`
                          : "—"}
                      </TableCell>
                      <TableCell>{company?.name || "—"}</TableCell>
                      <TableCell>
                        {c.batch_id ? (
                          <Link
                            href={`/batches/${c.batch_id}`}
                            className="text-status-info-dot hover:underline"
                          >
                            {batch?.batch_name || "View batch"}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{c.specialty_required || "—"}</TableCell>
                      <TableCell>
                        <CaseStatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(c.due_date)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Completed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5" />
            Completed reviews
            <Badge variant="secondary" className="ml-2">
              {completedCount}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedCount === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No completed reviews yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Batch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r: any) => {
                  const rc = r.review_case || r.review_cases;
                  const provider = rc?.provider || rc?.providers;
                  const company = rc?.company || rc?.companies;
                  const mins = r.time_spent_minutes;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(r.submitted_at)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {provider
                          ? `${provider.first_name} ${provider.last_name}`
                          : "—"}
                      </TableCell>
                      <TableCell>{company?.name || "—"}</TableCell>
                      <TableCell>
                        {r.overall_score != null ? (
                          <span className="font-medium">
                            {r.overall_score}
                            <span className="text-xs text-muted-foreground">/100</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {mins ? `${(mins / 60).toFixed(1)}h` : "—"}
                      </TableCell>
                      <TableCell>
                        {rc?.batch_id ? (
                          <Link
                            href={`/batches/${rc.batch_id}`}
                            className="text-status-info-dot hover:underline"
                          >
                            View
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Aautipay Onboarding */}
      <PeerOnboardCard
        peerId={peer.id}
        paymentReady={peer.payment_ready ?? false}
        beneficiaryStatus={peer.aautipay_beneficiary_status ?? null}
        bankStatus={peer.aautipay_bank_status ?? null}
        w9Status={peer.w9_status ?? null}
        defaults={{
          firstName: peer.full_name?.split(" ")[0] ?? null,
          lastName:
            peer.full_name?.split(" ").slice(1).join(" ") ?? null,
          email: peer.email ?? null,
        }}
      />

      {/* SA-126: Credentialing Log */}
      <PeerCredentialingLog peerId={peer.id} />

      {/* SA-031L: State History */}
      <PeerStateHistory peerId={peer.id} />

      {/* Availability */}
      {availability !== "available" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarX className="h-5 w-5" />
              Current unavailability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Reason: </span>
              {peer.unavailable_reason || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">From: </span>
              {formatDate(peer.unavailable_from)}
            </div>
            <div>
              <span className="text-muted-foreground">Until: </span>
              {formatDate(peer.unavailable_until)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
