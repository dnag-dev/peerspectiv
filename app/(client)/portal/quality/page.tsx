import { getDemoCompany } from "@/lib/portal/queries";
import { QualityInsights } from "./QualityInsights";

export const dynamic = "force-dynamic";

export default async function QualityPage() {
  const company = await getDemoCompany();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Quality Reports</h1>
        <p className="text-sm text-ink-400">
          AI-generated insights from your review data
        </p>
      </div>
      <QualityInsights companyId={company.id} companyName={company.name} />
    </div>
  );
}
