import { getDemoCompany } from "@/lib/portal/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CanonicalReportPanel } from "@/components/reports/CanonicalReportsTabs";
import { DownloadAllPanel } from "@/components/reports/DownloadAllPanel";
import { QualityInsights } from "./QualityInsights";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * Phase 3.5 — Client portal Reports page.
 * Hosts the same 5 canonical report types as admin, with the company
 * locked to the current user's company. Cross-tenant URL manipulation
 * (passing a different company_id in the body) → 403 (enforced server-side
 * by lib/reports/persona-guard.ts).
 */
export default async function QualityPage() {
  noStore();
  const company = await getDemoCompany();
  const lockedCompanies = [{ id: company.id, name: company.name }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Quality Reports</h1>
        <p className="text-sm text-ink-400">
          Five canonical reports for {company.name}, plus AI insights.
        </p>
      </div>

      <Tabs defaultValue="per_provider" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="per_provider">Per-Provider</TabsTrigger>
          <TabsTrigger value="question_analytics">Question Analytics</TabsTrigger>
          <TabsTrigger value="specialty_highlights">Specialty Highlights</TabsTrigger>
          <TabsTrigger value="provider_highlights">Provider Highlights</TabsTrigger>
          <TabsTrigger value="quality_certificate">Quality Certificate</TabsTrigger>
          <TabsTrigger value="download_all">Download All</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="per_provider">
          <CanonicalReportPanel
            type="per_provider"
            companies={lockedCompanies}
            lockedCompanyId={company.id}
          />
        </TabsContent>
        <TabsContent value="question_analytics">
          <CanonicalReportPanel
            type="question_analytics"
            companies={lockedCompanies}
            lockedCompanyId={company.id}
          />
        </TabsContent>
        <TabsContent value="specialty_highlights">
          <CanonicalReportPanel
            type="specialty_highlights"
            companies={lockedCompanies}
            lockedCompanyId={company.id}
          />
        </TabsContent>
        <TabsContent value="provider_highlights">
          <CanonicalReportPanel
            type="provider_highlights"
            companies={lockedCompanies}
            lockedCompanyId={company.id}
          />
        </TabsContent>
        <TabsContent value="quality_certificate">
          <CanonicalReportPanel
            type="quality_certificate"
            companies={lockedCompanies}
            lockedCompanyId={company.id}
          />
        </TabsContent>
        <TabsContent value="download_all">
          <DownloadAllPanel companies={lockedCompanies} />
        </TabsContent>
        <TabsContent value="insights">
          <QualityInsights companyId={company.id} companyName={company.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
