import { getDemoCompany } from "@/lib/portal/queries";
import { ExportGrid } from "./ExportGrid";
import { DownloadAllPanel } from "@/components/reports/DownloadAllPanel";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const company = await getDemoCompany();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Export & Reports</h1>
        <p className="text-sm text-ink-400">
          Generate downloadable reports for {company.name}
        </p>
      </div>
      <DownloadAllPanel companies={[{ id: company.id, name: company.name }]} />
      <ExportGrid companyId={company.id} companyName={company.name} />
    </div>
  );
}
