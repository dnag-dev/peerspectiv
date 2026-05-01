"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Props {
  pendingCount: number;
  assignedCount: number;
}

export function AssignTabsNav({ pendingCount, assignedCount }: Props) {
  const sp = useSearchParams();
  const tab = sp.get("tab") === "assigned" ? "assigned" : "pending";
  return (
    <div className="border-b border-ink-200">
      <nav className="-mb-px flex gap-6" aria-label="Assign tabs">
        <TabLink href="/assign?tab=pending" active={tab === "pending"} count={pendingCount}>
          Pending approval
        </TabLink>
        <TabLink href="/assign?tab=assigned" active={tab === "assigned"} count={assignedCount}>
          Assigned
        </TabLink>
      </nav>
    </div>
  );
}

function TabLink({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 border-b-2 px-1 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-cobalt-700 text-cobalt-700"
          : "border-transparent text-ink-600 hover:border-ink-300 hover:text-ink-800"
      }`}
    >
      {children}
      <span
        className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] ${
          active ? "bg-cobalt-100 text-cobalt-700" : "bg-ink-100 text-ink-600"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}
