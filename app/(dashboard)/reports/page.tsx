import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CanonicalReportPanel } from "@/components/reports/CanonicalReportsTabs";
import { AssignmentResultsTab } from "@/components/reports/AssignmentResultsTab";
import { QAPIReportTab } from "@/components/reports/QAPIReportTab";
import { PeerScorecardTab } from "@/components/reports/PeerScorecardTab";
import { SavedReportsTab } from "@/components/reports/SavedReportsTab";
import { DownloadAllPanel } from "@/components/reports/DownloadAllPanel";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  noStore();
  const companyRows = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(eq(companies.status, "active"))
    .orderBy(asc(companies.name));

  // Pull YTD submitted-results counts per company so we can rank.
  const ytdStart = `${new Date().getFullYear()}-01-01`;
  const rows = await db.execute<{ company_id: string; cnt: number }>(sql`
    SELECT rc.company_id, COUNT(rr.id)::int AS cnt
    FROM review_cases rc
    INNER JOIN review_results rr ON rr.case_id = rc.id
    WHERE rr.submitted_at >= ${ytdStart}
    GROUP BY rc.company_id
  `);
  const counts = new Map<string, number>();
  for (const r of (rows as any).rows ?? rows) {
    counts.set(r.company_id as string, Number(r.cnt));
  }

  type RankedCompany = { id: string; name: string; case_count: number };
  const raw: RankedCompany[] = companyRows.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    case_count: counts.get(c.id) ?? 0,
  }));
  const withData = raw
    .filter((c) => c.case_count > 0)
    .sort((a, b) => b.case_count - a.case_count);
  const withoutData = raw.filter((c) => c.case_count === 0);
  const companyList = [...withData, ...withoutData].map(({ id, name }) => ({
    id,
    name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Reports</h1>
        <p className="text-sm text-muted-foreground">
          The five canonical report types plus reviewer scorecard, bulk download,
          and legacy reports.
        </p>
      </div>

      <Tabs defaultValue="per_provider" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="per_provider">Per-Provider Review Answers</TabsTrigger>
          <TabsTrigger value="question_analytics">Question Analytics</TabsTrigger>
          <TabsTrigger value="specialty_highlights">Specialty Highlights</TabsTrigger>
          <TabsTrigger value="provider_highlights">Provider Highlights</TabsTrigger>
          <TabsTrigger value="quality_certificate">Quality Certificate</TabsTrigger>
          <TabsTrigger value="scorecard">Reviewer/Peer Scorecard</TabsTrigger>
          <TabsTrigger value="download_all">Download All</TabsTrigger>
          <TabsTrigger value="legacy">Legacy</TabsTrigger>
        </TabsList>

        <TabsContent value="per_provider">
          <CanonicalReportPanel type="per_provider" companies={companyList} />
        </TabsContent>
        <TabsContent value="question_analytics">
          <CanonicalReportPanel type="question_analytics" companies={companyList} />
        </TabsContent>
        <TabsContent value="specialty_highlights">
          <CanonicalReportPanel type="specialty_highlights" companies={companyList} />
        </TabsContent>
        <TabsContent value="provider_highlights">
          <CanonicalReportPanel type="provider_highlights" companies={companyList} />
        </TabsContent>
        <TabsContent value="quality_certificate">
          <div className="space-y-4">
            <CanonicalReportPanel type="quality_certificate" companies={companyList} />
            <DownloadAllPanel companies={companyList} />
          </div>
        </TabsContent>

        <TabsContent value="scorecard">
          <PeerScorecardTab />
        </TabsContent>

        <TabsContent value="download_all">
          <DownloadAllPanel companies={companyList} />
        </TabsContent>

        <TabsContent value="legacy">
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              These tabs predate the canonical report set. Kept for back-compat
              and free-form QAPI narratives.
            </p>
            <Tabs defaultValue="assignments" className="space-y-4">
              <TabsList>
                <TabsTrigger value="assignments">Assignment Results (legacy)</TabsTrigger>
                <TabsTrigger value="qapi">QAPI Report (legacy)</TabsTrigger>
                <TabsTrigger value="saved">Saved Reports</TabsTrigger>
              </TabsList>
              <TabsContent value="assignments">
                <AssignmentResultsTab companies={companyList} />
              </TabsContent>
              <TabsContent value="qapi">
                <QAPIReportTab companies={companyList} />
              </TabsContent>
              <TabsContent value="saved">
                <SavedReportsTab companies={companyList} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
