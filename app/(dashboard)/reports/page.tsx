import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignmentResultsTab } from "@/components/reports/AssignmentResultsTab";
import { QAPIReportTab } from "@/components/reports/QAPIReportTab";
import { PeerScorecardTab } from "@/components/reports/PeerScorecardTab";
import { PdfGeneratorTab } from "@/components/reports/PdfGeneratorTab";
import { SavedReportsTab } from "@/components/reports/SavedReportsTab";

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const companyRows = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(eq(companies.status, 'active'))
    .orderBy(asc(companies.name));

  // Pull YTD submitted-results counts per company.
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

  const withData = raw.filter((c) => c.case_count > 0).sort(
    (a, b) => b.case_count - a.case_count
  );
  const withoutData = raw.filter((c) => c.case_count === 0);
  const companyList = [...withData, ...withoutData].map(({ id, name }) => ({ id, name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">
          Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          View assignment results, generate QAPI reports, and review scorecard data
        </p>
      </div>

      <Tabs defaultValue="assignments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assignments">Assignment Results</TabsTrigger>
          <TabsTrigger value="qapi">QAPI Report</TabsTrigger>
          <TabsTrigger value="scorecard">Peer Scorecard</TabsTrigger>
          <TabsTrigger value="pdf">PDF Generator</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments">
          <AssignmentResultsTab companies={companyList} />
        </TabsContent>

        <TabsContent value="qapi">
          <QAPIReportTab companies={companyList} />
        </TabsContent>

        <TabsContent value="scorecard">
          <PeerScorecardTab />
        </TabsContent>

        <TabsContent value="pdf">
          <PdfGeneratorTab companies={companyList} />
        </TabsContent>

        <TabsContent value="saved">
          <SavedReportsTab companies={companyList} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
