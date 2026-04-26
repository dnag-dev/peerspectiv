import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
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

export const dynamic = "force-dynamic";

// Flat estimate until a payments/rates table exists.
const ESTIMATED_RATE_PER_CASE = 75;

const AVAILABILITY_STYLES: Record<string, string> = {
  available: "bg-mint-100 text-cobalt-700",
  vacation: "bg-critical-100 text-critical-700",
  on_leave: "bg-amber-100 text-amber-700",
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

async function getReviewerDetail(id: string) {
  const { data: reviewer, error } = await supabaseAdmin
    .from("reviewers")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !reviewer) return null;

  const { data: cases } = await supabaseAdmin
    .from("review_cases")
    .select(
      "id, status, due_date, assigned_at, specialty_required, batch_id, providers(first_name, last_name), companies(name), batches(batch_name)"
    )
    .eq("reviewer_id", id)
    .order("due_date", { ascending: true });

  const { data: results } = await supabaseAdmin
    .from("review_results")
    .select(
      "id, case_id, overall_score, submitted_at, time_spent_minutes, narrative_final, review_cases(id, batch_id, providers(first_name, last_name), companies(name))"
    )
    .eq("reviewer_id", id)
    .order("submitted_at", { ascending: false });

  return { reviewer, cases: cases ?? [], results: results ?? [] };
}

export default async function ReviewerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getReviewerDetail(params.id);
  if (!data) notFound();
  const { reviewer, cases, results } = data;

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

  const availability = reviewer.availability_status || "available";
  const availClass = AVAILABILITY_STYLES[availability] || AVAILABILITY_STYLES.inactive;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/reviewers" className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Reviewers
        </Link>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="flex items-start justify-between gap-6 pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-brand-navy text-lg font-semibold text-white">
              {initials(reviewer.full_name)}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">
                {reviewer.full_name || "Unnamed Reviewer"}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {reviewer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {reviewer.email}
                  </span>
                )}
                {reviewer.specialty && (
                  <span className="flex items-center gap-1">
                    <Stethoscope className="h-3.5 w-3.5" />
                    {reviewer.specialty}
                  </span>
                )}
                {reviewer.board_certification && (
                  <span>Board: {reviewer.board_certification}</span>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Badge className={cn("border-0", availClass)}>
                  {availability.replace("_", " ")}
                </Badge>
                {availability !== "available" && reviewer.unavailable_until && (
                  <span className="text-xs text-muted-foreground">
                    Returns {formatDate(reviewer.unavailable_until)}
                    {reviewer.unavailable_reason && ` · ${reviewer.unavailable_reason}`}
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
            <ClipboardCheck className="h-5 w-5 text-cobalt-600" />
            <div>
              <p className="text-xs text-muted-foreground">Active cases</p>
              <p className="text-xl font-semibold">{activeCases.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="h-5 w-5 text-cobalt-600" />
            <div>
              <p className="text-xs text-muted-foreground">Completed reviews</p>
              <p className="text-xl font-semibold">{completedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground">Avg time / review</p>
              <p className="text-xl font-semibold">
                {avgMinutes ? `${avgHours}h` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <DollarSign className="h-5 w-5 text-cobalt-600" />
            <div>
              <p className="text-xs text-muted-foreground">
                Earnings <span className="italic">(est.)</span>
              </p>
              <p className="text-xl font-semibold">
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
                            className="text-cobalt-600 hover:underline"
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
                          <span className="font-semibold">
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
                            className="text-cobalt-600 hover:underline"
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
              {reviewer.unavailable_reason || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">From: </span>
              {formatDate(reviewer.unavailable_from)}
            </div>
            <div>
              <span className="text-muted-foreground">Until: </span>
              {formatDate(reviewer.unavailable_until)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
