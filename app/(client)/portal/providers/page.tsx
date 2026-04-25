import Link from "next/link";
import { getDemoCompany, getProviderPerformance } from "@/lib/portal/queries";

export const dynamic = "force-dynamic";

function color(score: number) {
  if (score >= 85) return "#22C55E";
  if (score >= 70) return "#F59E0B";
  return "#EF4444";
}

export default async function ProvidersIndex() {
  const company = await getDemoCompany();
  const list = await getProviderPerformance(company.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Providers</h1>
        <p className="text-sm text-ink-400">
          All providers for {company.name} ({list.length})
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((p) => (
          <Link
            key={p.id}
            href={`/portal/providers/${p.id}`}
            className="rounded-lg p-4 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#1A3050" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">{p.name}</div>
                <div className="text-xs text-ink-400">{p.specialty}</div>
              </div>
              <span
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  backgroundColor: `${color(p.avg)}22`,
                  color: color(p.avg),
                }}
              >
                {p.avg}%
              </span>
            </div>
            <div className="mt-2 text-xs text-ink-500">{p.count} reviews</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
