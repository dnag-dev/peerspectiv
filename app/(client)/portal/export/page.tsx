import { getDemoCompany } from "@/lib/portal/queries";
import { ExportGrid } from "./ExportGrid";
import { DownloadAllPanel } from "@/components/reports/DownloadAllPanel";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  noStore();
  const company = await getDemoCompany();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-ink-primary">Export & Reports</h1>
        <p className="text-sm text-ink-tertiary">
          Generate downloadable reports for {company.name}
        </p>
      </div>
      <DownloadAllPanel companies={[{ id: company.id, name: company.name }]} />
      <ExportGrid companyId={company.id} companyName={company.name} />
    </div>
  );
}
