"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  companies: Array<{ id: string; name: string | null }>;
  /** Currently active company id from the URL (or empty string for "all"). */
  current: string;
}

/**
 * SA-003 — admin dashboard "Filter by Company" dropdown. Updates `?company=`
 * in the URL; the server-side dashboard re-runs queries with that filter and
 * KPI Link hrefs append the same param so drill-downs preserve scope.
 */
export function CompanyFilter({ companies, current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setCompany(value: string) {
    const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
    if (value) {
      params.set("company", value);
    } else {
      params.delete("company");
    }
    const qs = params.toString();
    router.push(`/dashboard${qs ? "?" + qs : ""}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="dashboard-company-filter"
        className="text-xs uppercase tracking-wider text-ink-500 font-medium"
      >
        Company:
      </label>
      <select
        id="dashboard-company-filter"
        data-testid="company-filter"
        value={current}
        onChange={(e) => setCompany(e.target.value)}
        className="rounded-md border border-ink-300 bg-white px-2 py-1 text-sm"
      >
        <option value="">All companies</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name ?? "—"}
          </option>
        ))}
      </select>
    </div>
  );
}
