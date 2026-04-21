import { supabaseAdmin } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignmentResultsTab } from "@/components/reports/AssignmentResultsTab";
import { QAPIReportTab } from "@/components/reports/QAPIReportTab";
import { ReviewerScorecardTab } from "@/components/reports/ReviewerScorecardTab";

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const { data: companies } = await supabaseAdmin
    .from("companies")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  const companyList = (companies ?? []).map((c: any) => ({
    id: c.id as string,
    name: c.name as string,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
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
          <TabsTrigger value="scorecard">Reviewer Scorecard</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments">
          <AssignmentResultsTab companies={companyList} />
        </TabsContent>

        <TabsContent value="qapi">
          <QAPIReportTab companies={companyList} />
        </TabsContent>

        <TabsContent value="scorecard">
          <ReviewerScorecardTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
