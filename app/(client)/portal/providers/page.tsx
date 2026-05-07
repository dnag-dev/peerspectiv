import Link from "next/link";
import { getDemoCompany, getProviderPerformance } from "@/lib/portal/queries";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

function color(score: number) {
  if (score >= 85) return "#22C55E";
  if (score >= 70) return "#F59E0B";
  return "#EF4444";
}

interface PageProps {
  searchParams?: { q?: string; under?: string };
}

export default async function ProvidersIndex({ searchParams }: PageProps) {
  noStore();
  const company = await getDemoCompany();
  const list = await getProviderPerformance(company.id);

  const search = (searchParams?.q ?? "").toLowerCase().trim();
  const underRaw = searchParams?.under;
  const under = underRaw == null || underRaw === "" ? null : Number(underRaw);

  const filtered = list.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search)) return false;
    if (under != null && Number.isFinite(under) && !(p.avg < under)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-ink-primary">Providers</h1>
        <p className="text-sm text-ink-tertiary">
          All providers for {company.name} ({filtered.length} of {list.length})
        </p>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-lg p-3"
        style={{ backgroundColor: 'var(--color-card)' }}
      >
        <div className="flex flex-col">
          <label htmlFor="q" className="text-xs text-ink-tertiary mb-1">
            Search by name
          </label>
          <input
            id="q"
            name="q"
            type="text"
            defaultValue={searchParams?.q ?? ""}
            placeholder="e.g. Smith"
            className="rounded-md px-3 py-2 text-sm text-ink-primary"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="under" className="text-xs text-ink-tertiary mb-1">
            Score under
          </label>
          <input
            id="under"
            name="under"
            type="number"
            min={0}
            max={100}
            defaultValue={searchParams?.under ?? "70"}
            className="w-28 rounded-md px-3 py-2 text-sm text-ink-primary"
          />
        </div>
        <button
          type="submit"
          className="rounded-md px-4 py-2 text-sm font-medium text-ink-primary"
          style={{ backgroundColor: "#2563EB" }}
        >
          Filter
        </button>
        <Link
          href="/portal/providers"
          className="rounded-md px-4 py-2 text-sm text-ink-tertiary hover:text-ink-primary"
        >
          Clear
        </Link>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <Link
            key={p.id}
            href={`/portal/providers/${p.id}`}
            className="rounded-lg p-4 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-ink-primary">{p.name}</div>
                <div className="text-xs text-ink-tertiary">{p.specialty}</div>
              </div>
              <span
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: `${color(p.avg)}22`,
                  color: color(p.avg),
                }}
              >
                {p.avg}%
              </span>
            </div>
            <div className="mt-2 text-xs text-ink-secondary">{p.count} reviews</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
