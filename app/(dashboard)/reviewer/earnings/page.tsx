import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Clock, FileText, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

// Demo portal doesn't tie to a specific reviewer login, so the earnings page
// mirrors the queue page and shows every reviewer's cases. When we wire real
// auth we'll filter by the current reviewer's id here.

type Row = {
  case_id: string;
  status: string;
  patient: string;
  specialty: string | null;
  company: string | null;
  reviewer_id: string;
  reviewer_name: string;
  rate_type: string;
  rate_amount: string;
  time_spent_minutes: number | null;
  submitted_at: string | null;
  payout_status: string | null;
};

function unitLabel(rateType: string): string {
  if (rateType === "per_report") return "report";
  if (rateType === "per_hour") return "hr";
  return "min";
}

function computeUnits(rateType: string, minutes: number, completed: boolean): number {
  if (rateType === "per_report") return completed ? 1 : 0;
  if (rateType === "per_hour") return minutes / 60;
  return minutes; // per_minute
}

function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatMinutes(m: number | null): string {
  if (!m || m <= 0) return "0m";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
}

const STATUS_STYLE: Record<string, string> = {
  assigned: "bg-ink-100 text-ink-800",
  in_progress: "bg-warning-100 text-warning-700",
  completed: "bg-mint-100 text-mint-700",
  past_due: "bg-critical-100 text-critical-700",
};

const PAYOUT_STYLE: Record<string, string> = {
  pending: "bg-warning-100 text-warning-700",
  approved: "bg-info-100 text-info-600",
  paid: "bg-mint-100 text-mint-700",
};

export default async function ReviewerEarningsPage() {
  // Pull every case + its reviewer rate + time spent + most-recent payout
  // status (if any). LEFT JOIN review_results for the minutes; LEFT JOIN the
  // most recent reviewer_payouts row by period to surface payout state.
  const rows = await db.execute<Row>(sql`
    SELECT
      rc.id           AS case_id,
      rc.status       AS status,
      (p.first_name || ' ' || p.last_name) AS patient,
      COALESCE(rc.specialty_required, p.specialty) AS specialty,
      c.name          AS company,
      r.id            AS reviewer_id,
      r.full_name     AS reviewer_name,
      COALESCE(r.rate_type, 'per_minute') AS rate_type,
      COALESCE(r.rate_amount, 1)::text    AS rate_amount,
      rr.time_spent_minutes,
      rr.submitted_at,
      (
        SELECT rp.status
        FROM reviewer_payouts rp
        WHERE rp.reviewer_id = r.id
          AND rr.submitted_at IS NOT NULL
          AND rr.submitted_at::date BETWEEN rp.period_start AND rp.period_end
        ORDER BY rp.created_at DESC
        LIMIT 1
      ) AS payout_status
    FROM review_cases rc
    JOIN providers p  ON p.id = rc.provider_id
    JOIN reviewers r  ON r.id = rc.reviewer_id
    LEFT JOIN companies c ON c.id = rc.company_id
    LEFT JOIN review_results rr ON rr.case_id = rc.id
    WHERE rc.status IN ('assigned','in_progress','completed','past_due')
    ORDER BY
      CASE rc.status
        WHEN 'in_progress' THEN 1
        WHEN 'assigned'    THEN 2
        WHEN 'past_due'    THEN 3
        WHEN 'completed'   THEN 4
        ELSE 5
      END,
      rr.submitted_at DESC NULLS LAST,
      rc.updated_at DESC
    LIMIT 200
  `);

  const data: Row[] = ((rows as any).rows ?? rows) as Row[];

  // Totals
  let totalMinutes = 0;
  let earnedCompleted = 0;
  let earnedInProgress = 0;
  let paid = 0;
  let pending = 0;
  let completedCount = 0;
  let inProgressCount = 0;

  const enriched = data.map((r) => {
    const rate = Number(r.rate_amount);
    const minutes = r.time_spent_minutes ?? 0;
    const completed = r.status === "completed";
    const units = computeUnits(r.rate_type, minutes, completed);
    const amount = Number.isFinite(rate) ? units * rate : 0;
    totalMinutes += minutes;

    if (completed) {
      completedCount++;
      earnedCompleted += amount;
      if (r.payout_status === "paid") paid += amount;
      else if (r.payout_status === "approved" || r.payout_status === "pending" || !r.payout_status) pending += amount;
    } else if (r.status === "in_progress" || r.status === "past_due") {
      inProgressCount++;
      earnedInProgress += amount;
    } else if (r.status === "assigned") {
      inProgressCount++;
    }

    return { ...r, units, amount, minutes, completed, rate };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Earnings</h1>
        <p className="text-sm text-muted-foreground">
          Time spent, computed earnings, and payout status across your cases.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Clock className="h-4 w-4" /> Time logged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-ink-900">{formatMinutes(totalMinutes)}</p>
            <p className="text-xs text-muted-foreground">
              {inProgressCount} in progress · {completedCount} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <FileText className="h-4 w-4" /> Earned (in progress)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning-700">{formatMoney(earnedInProgress)}</p>
            <p className="text-xs text-muted-foreground">Accruing as time is logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" /> Earned (completed)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-ink-900">{formatMoney(earnedCompleted)}</p>
            <p className="text-xs text-muted-foreground">
              {formatMoney(pending)} pending · {formatMoney(paid)} paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <DollarSign className="h-4 w-4 text-mint-600" /> Paid to date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-mint-700">{formatMoney(paid)}</p>
            <p className="text-xs text-muted-foreground">Settled payouts</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-case table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Case breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wider text-ink-500">
                  <th className="px-4 py-3">Case</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Time / Units</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Payout</th>
                </tr>
              </thead>
              <tbody>
                {enriched.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-ink-400">
                      No cases yet. Earnings will show here as cases are assigned.
                    </td>
                  </tr>
                )}
                {enriched.map((r) => {
                  const statusClass = STATUS_STYLE[r.status] ?? "bg-ink-100 text-ink-800";
                  const payoutKey = r.completed ? (r.payout_status ?? "pending") : null;
                  const payoutClass = payoutKey ? PAYOUT_STYLE[payoutKey] : null;
                  const unit = unitLabel(r.rate_type);
                  const unitsDisplay =
                    r.rate_type === "per_report"
                      ? `${r.units} ${unit}${r.units === 1 ? "" : "s"}`
                      : r.rate_type === "per_hour"
                        ? `${r.units.toFixed(2)} ${unit} (${formatMinutes(r.minutes)})`
                        : `${r.minutes} ${unit}`;
                  return (
                    <tr key={r.case_id} className="border-b border-ink-100 hover:bg-ink-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink-900">{r.patient}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.specialty ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-700">{r.company ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge className={`${statusClass} border-0`}>
                          {r.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-ink-700">{unitsDisplay}</td>
                      <td className="px-4 py-3 text-right text-ink-700">
                        {formatMoney(r.rate)}/{unit}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-ink-900">
                        {formatMoney(r.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {payoutKey ? (
                          <Badge className={`${payoutClass} border-0`}>
                            {payoutKey}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
