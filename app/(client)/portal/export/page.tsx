import { getDemoCompany } from "@/lib/portal/queries";
import { ExportGrid } from "./ExportGrid";
import { DownloadAllPanel } from "@/components/reports/DownloadAllPanel";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  noStore();
  const company = await getDemoCompany();
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">{company.name} · client portal</p>
        <h1 className="mt-0.5 text-xl font-medium tracking-tight text-ink-primary">Export &amp; reports</h1>
        <p className="mt-0.5 text-sm text-ink-secondary">
          Generate downloadable reports for {company.name}.
        </p>
      </div>
      <DownloadAllPanel companies={[{ id: company.id, name: company.name }]} />
      <ExportGrid companyId={company.id} companyName={company.name} />
    </div>
  );
}
